var ResourceHandlers = {
  String: function() {
    var resource = this;
    var data = resource.Extract();
    var str = [];
    while (data.length > 0) {
      let nchar = Utils.ToUInt32(data.splice(0, 2));
      if (nchar > data.length) throw("Overflow");
      str.push(Utils.DecodeUtf16(data.splice(0, nchar * 2)));
    }
    return str.join("\r\n");
  },

  Default: function() {
    var resource = this;
    return Utils.BytesToString(resource.Extract());
  },

  PNG: function() {
    var resource = this;
    var data = new Uint8Array(resource.Extract());
    var blob = new Blob([data], { type: "image/png" });
    var url = URL.createObjectURL(blob);
    var img = new Image();
    img.src = url;
    img.style.width = "fit-content";
    img.style.height = "fit-content";
    return img;
  },

  Bitmap: function() {

    // TODO: Tidy this and make it more robust!
    var resource = this;
    var dib = resource.Extract();

    offset = 14 +   // Size of BITMAPFILEHEADER
      Utils.ToUInt32(dib.slice(0, 4)) + // Size of BITMAPINFOHEADER
      4 * Utils.ToUInt32(dib.slice(32, 36));  // Size of RGBQUAD * Number of colours

    bfType = Utils.StringToBytes("BM");
    bfSize = Utils.ToLEBytes(14 + dib.length, 4);
    bfReserved1 = Utils.ToLEBytes(0, 2);
    bfReserved2 = Utils.ToLEBytes(0, 2);
    bfOffBits = Utils.ToLEBytes(offset, 4);

    var bmp = bfType
      .concat(bfSize)
      .concat(bfReserved1)
      .concat(bfReserved2)
      .concat(bfOffBits)
      .concat(dib);

    var blob = new Blob([new Uint8Array(bmp)], { type: "image/bmp" });
    var url = URL.createObjectURL(blob);
    var img = new Image();
    img.src = url;
    img.style.width = "fit-content";
    img.style.height = "fit-content";
    return img;
  },

  Cursor: function() {
    return ResourceHandlers.Bitmap.bind(this)();
  }
}