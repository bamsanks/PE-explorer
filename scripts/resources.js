// These handlers must return an HTML element
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
    var value = str.join("\r\n");
    return Utils.CreateTextArea(value);
  },

  Default: function() {
    var resource = this;
    var value = Utils.BytesToString(resource.Extract());
    return Utils.CreateTextArea(value);
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

    var bitcount = Utils.ToUInt32(dib.slice(14, 16));
    if (bitcount == 1) bitcount = 1; 
    else if (bitcount <= 4) bitcount = 4; 
    else if (bitcount <= 8) bitcount = 8; 
    else if (bitcount <= 16) bitcount = 16; 
    else if (bitcount <= 24) bitcount = 24; 
    else bitcount = 32; 

    offset = 14 +   // Size of BITMAPFILEHEADER
      Utils.ToUInt32(dib.slice(0, 4)) + // Size of BITMAPINFOHEADER
      4 * (1 << bitcount);  // Size of RGBQUAD * Number of colours

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
  },

  Version: function() {
    var reader = new Reader(this.Extract());
    var version = new VS_VERSIONINFO(reader);
    return Utils.CreateTextArea(version.toString());
  }
}