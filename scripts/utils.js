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
  },

  MappedAddress: function(value) {
    // TODO: Don't reference globals / exeFile etc here
    var addr = Formatters.Address(globals.exeFile._reader.MapAddress(value));
    addr.innerHTML += " <i style='color: #888;'>(mapped)</i>";
    return addr;
  },

  PEMagic: function(value) {
    if (typeof value == "number") {
      value = Utils.ToLEBytes(value);
    } else if (value instanceof Array) {
      value = Utils.ToUInt32(value);
    } else {
      throw("Unknown data type passed to formatter");
    }
    var hexValue = Formatters.Hex(value);
    if (value == Consts.PE_OPTIONAL_MAGIC.PE32) {
      return hexValue + " (32-bit)";
    } else if (value == Consts.PE_OPTIONAL_MAGIC.PE32_PLUS) {
      return hexValue + " (64-bit)";
    } else {
      return hexValue + " (unrecognised)";
    }
  },

  UnixTimestamp: function(value) {
    var date =  new Date(value * 1000);
    var y = date.getUTCFullYear(),
        m = (date.getUTCMonth()+1).toString().padStart(2, "0"),
        d = date.getUTCDate().toString().padStart(2, "0"),
        h = date.getUTCHours().toString().padStart(2, "0"),
        i = date.getUTCMinutes().toString().padStart(2, "0"),
        s = date.getUTCSeconds().toString().padStart(2, "0");
    return y + "-" + m + "-" + d + " " + 
           h + ":" + i + ":" + s + " (UTC)";
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
    link.onmouseenter = () => globals.viewer.SetHighlight(address, length, true); // TODO: Very dependent on globals...!
    link.onmouseleave = () => globals.viewer.SetHighlight(address, length, false);
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

  ConvertToChar: function(val, wrapInTag = false) {
    if (val == 32) return "&nbsp;";
    var preTag = wrapInTag ? "<noprint>" : "";
    var postTag = wrapInTag ? "</noprint>" : "";
    return (val > 32 && val < 127) ?
      String.fromCharCode(val) :
      preTag + "." + postTag;
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
  
  BytesToString: function(bytes, nullTerminate = true) {
    var s = "";
    for (let b of bytes) {
      if (nullTerminate && b == 0) return s;
      s += String.fromCharCode(b);
    }
    return s;
  },
  
  StringToBytes: function(str) {
    var b = [];
    for (let i = 0; i < str.length; i++) {
      b.push(str.charCodeAt(i));
    }
    return b;
  },

  DecodeUtf16: function(w) {
    var a8 = new Uint8Array(w);
    var a16 = new Uint16Array(a8.buffer);
    for (let i = 0; i < a16.length; i++) {
      // Ensure null-terminator applies
      if (a16[i] == 0) {
        a16 = a16.slice(0, i);
        break;
      }
    }
    return String.fromCharCode.apply(String, a16);
  },

  ValidHex: function(hex) {
    var hexRegExp = new RegExp(/^[0-9a-fA-F ]+$/);
    return hexRegExp.test(hex);
  },

  CreateTextArea: function(content, readOnly = true) {
    var domTextArea = document.createElement("textarea");
    domTextArea.readOnly = readOnly;
    domTextArea.value = content;
    return domTextArea;
  },

  RestrictToHex: function(element) {
    var strLen = element.value.length;
    var newStrChars = [];
    var j = 0;
    var initSel = element.selectionStart;
    var newSel = element.value.length;
    for (let i = 0; i < strLen; i++) {
      let foundChar = element.value.charAt(i);
      if (foundChar >= "A" && foundChar <= "F") {
        newStrChars.push(foundChar.toLowerCase());
        j++;
      } else if (foundChar >= "a" && foundChar <= "f") {
        newStrChars.push(foundChar);
        j++;
      } else if (foundChar >= "0" && foundChar <= "9") {
        newStrChars.push(foundChar);
        j++;
      }
      if (j % 3 == 2 && i != strLen - 1) {
        newStrChars.push(" ");
        j++;
      }
      if (i == initSel - 1) newSel = j;
    }
    element.value = newStrChars.join("");
    element.selectionStart = newSel;
    element.selectionEnd = newSel;
  }

}

