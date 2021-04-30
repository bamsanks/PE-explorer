var Formatters = {
  HexAndText: function(value) {
    var uintValue;
    if (typeof value == "number") {
      value = Utils.ToLEBytes(value);
      uintValue = value;
    } else if (value instanceof Array) {
      uintValue = Utils.ToUInt32(value);
    } else {
      throw("Unknown data type passed to formatter");
    }
    var hex = "0x" + uintValue.toString(16);
    var text = value.map(Utils.ConvertToChar).join("");
    return `${hex} (${text})`;
  },

  Hex: function(value) {
    return "0x" + value.toString(16);
  },

  Address: function(value) {
    return Utils.CreateJumpLink(
      Formatters.Hex(value),
      value);
  }
}

var Utils = {

  SaveByteArray: function(fileName, byte) {
    var blob = new Blob([new Uint8Array(byte)], {type: "application/octet-stream"});
    var link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(link.href);
  },

  CreateJumpLink: function(innerHTML, address, length = 1) {
    var link = document.createElement("a");
    link.onclick = () => globals.viewer.JumpTo(address, length); // TODO: Very dependent on globals...!
    link.setAttribute("href", "#B" + address);
    link.innerHTML = innerHTML;
    return link;
  },


  DecToHex: function(d, pad = 2) {
    var isArray = (d instanceof Array);
    if (!isArray) d = [d];
    for (let i in d) {
      d[i] = d[i].toString(16).padStart(pad, "0");
    }
    if (!isArray) d = d[0];
    return d;
  },

  HexToDec: function(h) {
    return Number.parseInt(h, 16);
  },

  ConvertToChar: function(val) {
    if (val == 32) return "&nbsp;";
    return (val > 32 && val < 127) ? String.fromCharCode(val) : ".";
  },

  ToSignedByte: function(byte) {
    if (byte < 0 || byte > 255) throw("Invalid byte value");
    return byte - (byte > 128 ? 256 : 0);
  },

  ToInt32: function(uInt32) {
    return uInt32 | 0;
  },

  ToLEBytes: function(value, size = 4) {
    var v = value;
    var bt = [];
    for (let i = 0; i < size; i++) {
      var b = v % 256;
      bt.push(b);
      v = (v - b) / 256;
    }
    return bt;
  },

  ToUInt32: function(bytes) {
    if (bytes.length > 4) throw("More than 4 bytes provided in ToUInt32!");
    var val = 0, exp = 1;
    for (let i = 0; i < bytes.length; i++) {
      val += (bytes[i] ?? 0) * exp;
      exp *= 256;
    }
    return val;
  },

  ParseDecOrHex: function(value) {
    if (typeof value === "number") return value;
    var hexParse = Number.parseInt(value, 16);
    var decParse = Number.parseInt(value);
    if (value.startsWith("0x") || value.match(/[a-f]/)) {
      return hexParse;
    } else {
      return decParse;
    }
  },

  ShowJumpToWindow: function(callback) {
    var cont = document.getElementById("jumpToContainer");
    var inputBox = cont.getElementsByTagName("input")[0];
    cont.style.visibility = "visible";
    inputBox.focus();
    inputBox.select();
    inputBox.onkeydown = function(e) {
      if (e.key == "Enter") callback(Utils.ParseDecOrHex(inputBox.value));
      if (["Enter", "Escape"].includes(e.key)) cont.style.visibility = "hidden";
    }
  },
  
  BytesToString: function(bytes) {
    var s = "";
    for (let b of bytes) {
      s += String.fromCharCode(b);
    }
    return s;
  }
}

