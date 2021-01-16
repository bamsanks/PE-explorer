class Range {
  _size;

  Start;
  End;
  RealStart;
  get Size() { return this._size; }
  set Size(value) {
    this._size = value;
    this.End = this.Start + value;
  }

  constructor(start, size, realStart) {
      this.Start = start;
      this.Size = size;
      this.RealStart = realStart;
  }

  Contains(value) {
    return value >= this.Start && value < this.End;
  }

  Map(address) {
    return address - this.Start + this.RealStart;
  }

}

class Field {
  _address; _value;

  get Address() { return this._address; }
  get Value() { return this._value; }

  constructor(address, value) {
    this._address = address;
    this._value = value;
  }

  toString() { return this._address.toString(16) + ": " + this._value; }
}

class MZHeader {
  Signature; ExtraBytes; Pages;
  RelocItems; HeaderSize; MinAlloc;
  MaxAlloc; InitSS; InitSP;
  Checksum; InitIP; InitCS;
  RelocTable; Overlay; OverlayInfo;
  OemIdentifier; OemInfo;

  PEHeaderStart;

  constructor(reader) {
    if (reader) this.ReadFromStream(reader);
  }

  ReadFromStream(reader) { 

      this.Signature = new Field(reader.Position, reader.ReadUInt16());
      this.ExtraBytes = new Field(reader.Position, reader.ReadUInt16());
      this.Pages = new Field(reader.Position, reader.ReadUInt16());
      this.RelocItems = new Field(reader.Position, reader.ReadUInt16());
      this.HeaderSize = new Field(reader.Position, reader.ReadUInt16());
      this.MinAlloc = new Field(reader.Position, reader.ReadUInt16());
      this.MaxAlloc = new Field(reader.Position, reader.ReadUInt16());
      this.InitSS = new Field(reader.Position, reader.ReadUInt16());
      this.InitSP = new Field(reader.Position, reader.ReadUInt16());
      this.Checksum = new Field(reader.Position, reader.ReadUInt16());
      this.InitIP = new Field(reader.Position, reader.ReadUInt16());
      this.InitCS = new Field(reader.Position, reader.ReadUInt16());
      this.RelocTable = new Field(reader.Position, reader.ReadUInt16());
      this.Overlay = new Field(reader.Position, reader.ReadUInt16());

      reader.ReadBytes(8); // Reserved space

      this.OemIdentifier = new Field(reader.Position, reader.ReadUInt16());
      this.OemInfo = new Field(reader.Position, reader.ReadUInt16());

      reader.ReadBytes(20); // Reserved space

      this.PEHeaderStart = new Field(reader.Position, reader.ReadUInt32());
  }

}

class PEHeader {

  Magic;
  Machine; NumberOfSections;
  TimeDateStamp; PointerToSymbolTable; NumberOfSymbols;
  SizeOfOptionalHeader; Characteristics;

  constructor(reader, startPos) {
    if (typeof startPos !== "undefined")
      reader.JumpTo(startPos, false);
    this.ReadFromStream(reader);
  }

  ReadFromStream(reader) {
    this.Magic = new Field(reader.Position, reader.ReadUInt32());
    this.Machine = new Field(reader.Position, reader.ReadUInt16());
    this.NumberOfSections = new Field(reader.Position, reader.ReadUInt16());
    this.TimeDateStamp = new Field(reader.Position, reader.ReadUInt32());
    this.PointerToSymbolTable = new Field(reader.Position, reader.ReadUInt32());
    this.NumberOfSymbols = new Field(reader.Position, reader.ReadUInt32());
    this.SizeOfOptionalHeader = new Field(reader.Position, reader.ReadUInt16());
    this.Characteristics = new Field(reader.Position, reader.ReadUInt16());
  }
}

class PEOptionalHeader {
  Magic;
  MajorLinkerVersion; MinorLinkerVersion;
  SizeOfCode; SizeOfInitializedData; SizeOfUninitializedData;
      AddressOfEntryPoint; BaseOfCode; BaseOfData;
  ImageBase;
  SectionAlignment; FileAlignment;
  MajorOperatingSystemVersion; MinorOperatingSystemVersion;
      MajorImageVersion; MinorImageVersion;
      MajorSubsystemVersion; MinorSubsystemVersion;
  Win32VersionValue; SizeOfImage; SizeOfHeaders; CheckSum;
  Subsystem;
  DllCharacteristics;
  SizeOfStackReserve; SizeOfStackCommit;
      SizeOfHeapReserve; SizeOfHeapCommit;
      LoaderFlags; NumberOfRvaAndSizes;

  directoryEntries;

  constructor(reader) {
    this.ReadFromStream(reader);
  }

  ReadFromStream(reader) {
      this.Magic = reader.ReadUInt16();

      var magicKnown =
        this.Magic == PE_OPTIONAL_MAGIC.PE32 ||
        this.Magic == PE_OPTIONAL_MAGIC.PE32_PLUS;

      if (!magicKnown) throw("Unknown magic number in PE optional header");

      var bit32 = this.Magic == PE_OPTIONAL_MAGIC.PE32;

      this.MajorLinkerVersion = reader.ReadByte();
      this.MinorLinkerVersion = reader.ReadByte();
      this.SizeOfCode = reader.ReadUInt32();
      this.SizeOfInitializedData = reader.ReadUInt32();
      this.SizeOfUninitializedData = reader.ReadUInt32();
      this.AddressOfEntryPoint = reader.ReadUInt32();
      this.BaseOfCode = reader.ReadUInt32();
      this.BaseOfData = bit32 ? reader.ReadUInt32() : 0;

      this.ImageBase = bit32 ? reader.ReadUInt32() : reader.ReadUInt64();
      this.SectionAlignment = reader.ReadUInt32();
      this.FileAlignment = reader.ReadUInt32();
      this.MajorOperatingSystemVersion = reader.ReadUInt16();
      this.MinorOperatingSystemVersion = reader.ReadUInt16();
      this.MajorImageVersion = reader.ReadUInt16();
      this.MinorImageVersion = reader.ReadUInt16();
      this.MajorSubsystemVersion = reader.ReadUInt16();
      this.MinorSubsystemVersion = reader.ReadUInt16();
      this.Win32VersionValue = reader.ReadUInt32();
      this.SizeOfImage = reader.ReadUInt32();
      this.SizeOfHeaders = reader.ReadUInt32();
      this.CheckSum = reader.ReadUInt32();
      this.Subsystem = reader.ReadUInt16();
      this.DllCharacteristics = reader.ReadUInt16();
      this.SizeOfStackReserve = bit32 ? reader.ReadUInt32() : reader.ReadUInt64();
      this.SizeOfStackCommit = bit32 ? reader.ReadUInt32() : reader.ReadUInt64();
      this.SizeOfHeapReserve = bit32 ? reader.ReadUInt32() : reader.ReadUInt64();
      this.SizeOfHeapCommit = bit32 ? reader.ReadUInt32() : reader.ReadUInt64();
      this.LoaderFlags = reader.ReadUInt32();
      this.NumberOfRvaAndSizes = reader.ReadUInt32();

      this.directoryEntries = []; //new DataDirectoryEntry[NumberOfRvaAndSizes];

      var directoryNames = [
        "Exports", "Imports", "Resources", "Exceptions",
        "Certificates", "Base Relocations", "Debug", "Architecture",
        "Global Pointer", "Thread Local Storage", "Load Config", "Bound Import",
        "Import Address Table", "Delay Import Descriptor", "CLR Runtime Header", "Reserved"
      ];

      for (let i = 0; i < this.NumberOfRvaAndSizes; i++) {
          this.directoryEntries[i] = new DataDirectoryEntry(
              directoryNames[i],
              reader.ReadUInt32(),
              reader.ReadUInt32());
          /////
          // streamMap.JumpTo(directoryEntries[i].RelativeVirtualAddress);
          // directoryEntries[i].data =
          //     reader.ReadBytes((int)directoryEntries[i].SizeOfDirectory);
          // directoryEntries[i].dataStr = ASCIIEncoding.ASCII.GetString(directoryEntries[i].data);
          // streamMap.JumpBack();
          /////
      }

  }

  // VarLengthByteArray(d, bit32) {
  //     if (bit32) {
  //         return BitConverter.GetBytes((ushort)d);
  //     } else {
  //         return BitConverter.GetBytes(d);
  //     }
  // }

  // byte[] Serialize() {
  //     return Utils.CombineBytes(
  //         BitConverter.GetBytes((ushort)Magic),
  //         BitConverter.GetBytes(MajorLinkerVersion),
  //         BitConverter.GetBytes(MinorLinkerVersion),
  //         BitConverter.GetBytes(SizeOfCode),
  //         BitConverter.GetBytes(SizeOfInitializedData),
  //         BitConverter.GetBytes(SizeOfUninitializedData),
  //         BitConverter.GetBytes(AddressOfEntryPoint),
  //         BitConverter.GetBytes(BaseOfCode),
  //         bit32 ? BitConverter.GetBytes(BaseOfData) : new byte[0],
  //         VarLengthByteArray(ImageBase, bit32),
  //         BitConverter.GetBytes(SectionAlignment),
  //         BitConverter.GetBytes(FileAlignment),
  //         BitConverter.GetBytes(MajorOperatingSystemVersion),
  //         BitConverter.GetBytes(MinorOperatingSystemVersion),
  //         BitConverter.GetBytes(MajorImageVersion),
  //         BitConverter.GetBytes(MinorImageVersion),
  //         BitConverter.GetBytes(MajorSubsystemVersion),
  //         BitConverter.GetBytes(MinorSubsystemVersion),
  //         BitConverter.GetBytes(Win32VersionValue),
  //         BitConverter.GetBytes(SizeOfImage),
  //         BitConverter.GetBytes(SizeOfHeaders),
  //         BitConverter.GetBytes(CheckSum),
  //         BitConverter.GetBytes(Subsystem),
  //         BitConverter.GetBytes((ushort)DllCharacteristics),
  //         VarLengthByteArray(SizeOfStackReserve, bit32),
  //         VarLengthByteArray(SizeOfStackCommit, bit32),
  //         VarLengthByteArray(SizeOfHeapReserve, bit32),
  //         VarLengthByteArray(SizeOfHeapCommit, bit32),
  //         BitConverter.GetBytes(LoaderFlags),
  //         BitConverter.GetBytes(NumberOfRvaAndSizes));

  // }

}

class DataDirectoryEntry {
  name;
  RelativeVirtualAddress;
  SizeOfDirectory;
  data;
  dataStr;

  constructor(name, relativeVirtualAddress, sizeOfDirectory) {
      this.name = name;
      this.RelativeVirtualAddress = relativeVirtualAddress;
      this.SizeOfDirectory = sizeOfDirectory;
  }

  toString() {
    return this.name;
  }
}


class SectionHeader {
  Name;
  VirtualSize;
  VirtualAddress;
  SizeOfRawData;
  PointerToRawData;
  PointerToRelocations;
  PointerToLineNumbers;
  NumberOfRelocations;
  NumberOfLineNumbers;
  Characteristics;

  constructor(reader) {
    this.ReadFromStream(reader);
  }

  CreateRangeMap() {
    return new Range(
      this.VirtualAddress,
      this.SizeOfRawData,
      this.PointerToRawData);
  }

  ReadFromStream(reader) {
      this.Name = reader.ReadBytes(8).map(x => String.fromCharCode(x)).join("");
      this.VirtualSize = reader.ReadUInt32();
      this.VirtualAddress = reader.ReadUInt32();
      this.SizeOfRawData = reader.ReadUInt32();
      this.PointerToRawData = reader.ReadUInt32();
      this.PointerToRelocations = reader.ReadUInt32();
      this.PointerToLineNumbers = reader.ReadUInt32();
      this.NumberOfRelocations = reader.ReadUInt16();
      this.NumberOfLineNumbers = reader.ReadUInt16();
      this.Characteristics = reader.ReadUInt32();
  }
}

class Import {
  ByOrdinal;
  // Ordinal;
  // ImportName;
  // ImportNameLoc;

  constructor(code, bit64 = false) {
      var mask = bit64 ? 0x8000000000000000 : 0x80000000;
      this.ByOrdinal = (code | mask) == mask;
      if (this.ByOrdinal) {
        this.Ordinal = code & 0xFFFF;
      } else {
        this.ImportNameLoc = code & 0xFFFFFFFF;
      }
  }

}

class Export {
  Name;
  Rva;

  constructor(name, rva) {
    this.Name = name;
    this.Rva = rva;
  }

  toString() {
    return this.Name;
  }
}

class ImportSection {
  ImportLookupTableRVA;
  Timestamp;
  ForwarderChain;
  NameRVA;
  ImportAddressTableRVA;

  Imports;
  DllName;

  _bit64;
  _reader;

  IsEmpty() {
    return this.ImportLookupTableRVA == 0 &&
      this.Timestamp == 0 &&
      this.ForwarderChain == 0 &&
      this.NameRVA == 0 &&
      this.ImportAddressTableRVA == 0;
  }

  ResolveDllName() {
    this._reader.JumpTo(this.NameRVA);
    this.DllName = this._reader.ReadNTString();
    this._reader.JumpBack();
  }

  constructor(reader, bit64 = false) {
      this._reader = reader;
      this.ImportLookupTableRVA = this._reader.ReadUInt32();
      this.Timestamp = this._reader.ReadUInt32();
      this.ForwarderChain = this._reader.ReadUInt32();
      this.NameRVA = this._reader.ReadUInt32();
      this.ImportAddressTableRVA = this._reader.ReadUInt32();
      this.bit64 = bit64;
      this.ResolveDllName();

      if (this.IsEmpty()) return;

      this._reader.JumpTo(this.ImportLookupTableRVA);
      this.Imports = this.ReadImports();
      this._reader.JumpBack();

  }

  ReadImports() {
      var imports = [];
      var importEntry = this._bit64 ?
        this._reader.ReadUInt64() :
        this._reader.ReadUInt32();
      while (importEntry != 0) {
          var importItem = new Import(importEntry, this._bit64);
          /// Messy
          this._reader.JumpTo(importItem.ImportNameLoc);
          this._reader.ReadUInt16(); //// TODO: Use this.. this is the "hint" part of the hint table
          importItem.ImportName = this._reader.ReadNTString();
          if (this._reader.Position % 2 == 1) this._reader.ReadByte();
          this._reader.JumpBack();
          ///
          imports.push(importItem);
          importEntry = this._bit64 ?
            this._reader.ReadUInt64() :
            this._reader.ReadUInt32();

      }
      return imports;
  }
}


class ExportSection {
  ExportFlags;
  Timestamp;
  MajorVersion;
  MinorVersion;
  NameRVA;
  OrdinalBase;
  AddressTableEntries;
  NumNamePointers;
  ExportAddressTableRVA;
  NamePointerRVA;
  OrdinalTableRVA;
  DllName;
  Exports;

  constructor(reader) {
    this.ReadFromStream(reader);
  }

  _getName(reader) {
      reader.JumpTo(this.NameRVA);
      var dllName = reader.ReadNTString();
      reader.JumpBack();
      return dllName;
  }

  _getExports(reader) {
      reader.JumpTo(this.NamePointerRVA);
      var exports = [];
      for (let i = 0; i < this.NumNamePointers; i++) {
          // Get name
          reader.JumpTo(this.NamePointerRVA + i * 4, false);
          reader.JumpTo(reader.ReadInt32(), false);
          var s = reader.ReadNTString();

          // Get ordinal
          reader.JumpTo(this.OrdinalTableRVA + i * 2, false);
          var o = reader.ReadInt16();

          // Get address
          reader.JumpTo(this.ExportAddressTableRVA + o * 4, false);
          var rva = reader.ReadInt32();
          exports.push(new Export(s, rva));
      }
      reader.JumpBack();
      return exports;
  }

  ReadFromStream(reader) {
    this.ExportFlags = reader.ReadUInt32();
    this.Timestamp = reader.ReadUInt32();
    this.MajorVersion = reader.ReadUInt16();
    this.MinorVersion = reader.ReadUInt16();
    this.NameRVA = reader.ReadUInt32();
    this.OrdinalBase = reader.ReadUInt32();
    this.AddressTableEntries = reader.ReadUInt32();
    this.NumNamePointers = reader.ReadUInt32();
    this.ExportAddressTableRVA = reader.ReadUInt32();
    this.NamePointerRVA = reader.ReadUInt32();
    this.OrdinalTableRVA = reader.ReadUInt32();

    this.DllName = this._getName(reader);
    this.Exports = this._getExports(reader);
  }

}


class ExeFile {
  Reader;
  MZHeader;
  PEHeader;
  PEOptionalHeader;
  SectionHeaders;
  Exports;
  Imports;

  EnumerateSectionHeaders() {
    var sections = [];
    for (let i = 0; i < this.PEHeader.NumberOfSections.Value; i++) {
      sections.push(new SectionHeader(this._reader));
    }
    return sections;
  }

  CreateRangeMaps() {
    var addressMaps = [];
    for (let header of this.SectionHeaders) {
      addressMaps.push(header.CreateRangeMap());
    }
    return addressMaps;
  }

  ReadImports() {
    var importEntry = this.PEOptionalHeader.directoryEntries[1];
    if (importEntry.SizeOfDirectory == 0) return null;
    this._reader.JumpTo(importEntry.RelativeVirtualAddress, false);

    var add = true;
    var sections = [];
    while (add) {
        let cont = this._reader.InVirtualRange(
            importEntry.RelativeVirtualAddress,
            importEntry.SizeOfDirectory);
        if (!cont) break;
        //try {
            var section = new ImportSection(this._reader);
            add = !section.IsEmpty();
            if (add) sections.push(section);
        // } catch {
        //     // This is fine, we just don't add
        //     add = false;
        // // } catch {    // TODO: Actually catch bad exceptions!
        // //     throw ex;
        // }
    }
    return sections;
  }

  ReadExports() {
    var exportEntry = this.PEOptionalHeader.directoryEntries[0];
    if (exportEntry.SizeOfDirectory == 0) return null;
    this._reader.JumpTo(exportEntry.RelativeVirtualAddress, false);
    return new ExportSection(this._reader);
  }

  constructor(data) {
    this._reader = new Reader(data);
    this.MZHeader = new MZHeader(this._reader);
    this.PEHeader = new PEHeader(this._reader, this.MZHeader.PEHeaderStart.Value);
    this.PEOptionalHeader = new PEOptionalHeader(this._reader);
    this.SectionHeaders = this.EnumerateSectionHeaders();
    this._reader.AddressMaps = this.CreateRangeMaps();
    this.Imports = this.ReadImports();
    this.Exports = this.ReadExports();
  }

}