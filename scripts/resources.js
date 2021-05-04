class STRING_RESOURCE {

  Value;

  constructor(reader, address) {
    this.ReadFromStream(reader, address);
  }

  ReadFromStream(reader, address) {
    this.reader = reader;
    // Only jump if address specified
    if (address != null) reader.JumpTo(address, true, false);

    var strLen = reader.ReadUInt16();
    this.Value = Utils.DecodeUtf16(reader.ReadBytes(strLen * 2));

    if (address != null) reader.JumpBack();
  }

}