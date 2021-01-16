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

  ReadByte() {
    if (this._position >= this._data.length || this._position < 0)
      throw("Past end of stream");
    return this._data[this._position++];
  }

  ReadBytes(n) {
    var b = [];
    for (let i = 0; i < n; i++) b.push(this.ReadByte());
    return b;
  }

  ReadInt16() {
    var v = this.ReadUInt16();
    if (v > 8388607) v -= 16777216;
    return v;
  }

  ReadUInt16() {
    var v = 0;
    for (let i = 0; i < 2; i++) {
      v += this.ReadByte() * Math.pow(256, i);
    }
    return v;
  }

  ReadInt32() {
    var v = this.ReadUInt32();
    if (v > 2147483647) v -= 4294967296;
    return v;
  }

  ReadUInt32() {
    var v = 0;
    for (let i = 0; i < 4; i++) {
      v += this.ReadByte() * Math.pow(256, i);
    }
    return v;
  }

  ReadUInt64() {
    var v = 0;
    for (let i = 0; i < 8; i++) {
      v += this.ReadByte() * Math.pow(256, i);
    }
    return v;
  }

  ReadNTString() {
    var b;
    var s = "";
    while ((b = this.ReadByte()) > 0) s += String.fromCharCode(b);
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

}