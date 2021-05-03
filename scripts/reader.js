class Field {
  _address; _value; _length;
  _formatter;

  get Address() { return this._address; }
  get Value() { return this._value; }
  get Length() { return this._length; }
  get Formatter() { return this._formatter };
  set Formatter(f) {
    if (typeof f != "function") throw("Formatter must be a function!");
    this._formatter = f;
  }

  constructor(value, address, length, formatter = null) {
    this._value = value;
    this._address = address;
    this._length = length;
    this._formatter = formatter;
  }

  toString() {
    var value = this._value;
    if (typeof this._formatter === "function") {
      value = this._formatter(this._value);
    } 
    return value;
  }
}

class Reader {
  _data;
  _position = 0;
  _posHistory = [];

  AddressMaps = [];

  constructor(data) {
    this._data = data;
  }

  JumpTo(address, remember = true, map = true) {
    if (remember) this._posHistory.push(this._position);
    this._position = map ? this.MapAddress(address) : address;
  }
    
  JumpBack() {
    this._position = this._posHistory.pop();
  }
  
  MapAddress(address) {
    for (let addressMap of this.AddressMaps) {
      if (addressMap.Contains(address)) {
        return addressMap.Map(address);
      }
    }
    return address;
  }
  
  InVirtualRange(start, size) {
    start = this.MapAddress(start);
    return (this._position >= start &&
            this._position < start + size);
  }

  get Position() { return this._position; }
  get Length() { return this._data.length; }

  ReadByte(asField = false) {
    if (this._position >= this._data.length || this._position < 0)
      throw("Past end of stream");
    var p = this._position;
    var data = this._data[this._position++];
    var decToHex = (x) => "0x" + Utils.DecToHex(x);
    if (asField) data = new Field(data, p, 1, decToHex);
    return data;
  }

  ReadBytes(n, asField = false) {
    var b = [];
    var p = this._position;
    for (let i = 0; i < n; i++) b.push(this.ReadByte());
    var decToHex = (x) => Utils.DecToHex(x).map(y => "0x" + y);
    if (asField) b = new Field(b, p, n, Utils.DecToHex);
    return b;
  }

  ReadInt16(asField = false) {
    var p = this._position;
    var v = this.ReadUInt16();
    if (v > 8388607) v -= 16777216;
    if (asField) v = new Field(v, p, 2);
    return v;
  }

  ReadUInt16(asField = false) {
    var v = 0;
    var p = this._position;
    for (let i = 0; i < 2; i++) {
      v += this.ReadByte() * Math.pow(256, i);
    }
    if (asField) v = new Field(v, p, 2);
    return v;
  }

  ReadInt32(asField = false) {
    var p = this._position;
    var v = this.ReadUInt32();
    if (v > 2147483647) v -= 4294967296;
    if (asField) v = new Field(v, p, 4);
    return v;
  }

  ReadUInt32(asField = false) {
    var v = 0;
    var p = this._position;
    for (let i = 0; i < 4; i++) {
      v += this.ReadByte() * Math.pow(256, i);
    }
    if (asField) v = new Field(v, p, 4);
    return v;
  }

  ReadUInt64(asField = false) {
    var v = 0;
    var p = this._position;
    for (let i = 0; i < 8; i++) {
      v += this.ReadByte() * Math.pow(256, i);
    }
    if (asField) v = new Field(v, p, 8);
    return v;
  }

  ReadFixedLengthString(len, nullTerminate = true, asField = false) {
    var p = this._position;
    var s = this.ReadBytes(len).map(
      x => String.fromCharCode(x)).join("");
    if (nullTerminate) s = s.split("\0")[0];
    if (asField) s = new Field(s, p, len);
    return s;
  }

  ReadNTString(asField = false) {
    var b;
    var s = "";
    var p = this._position;
    while ((b = this.ReadByte()) > 0)
      s += String.fromCharCode(b);
    if (asField) s = new Field(s, p, s.Length + 1);
    return s;
  }

  WriteByte(byte) {
    this._data[this._position] = byte;
    this._position += 1;
  }

  WriteUInt32(value) {
    var v = value;
    for (let i = 0; i < 4; i++) {
      var b = v % 256;
      this.WriteByte(b);
      v = (v - b) / 256;
    }
  }

  PrintHex(start, end) {
    var data = this._data.slice(start, end);
    return Array.from(data).map(y => Utils.DecToHex(y)).join(" ");
  }

}