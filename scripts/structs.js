const resourceTypes = ["Unknown",
  "Cursor", "Bitmap", "Icon", "Menu", 
  "Dialog", "String", "Font Directory", "Font", 
  "Accelerator", "RC Data", "Message Table", "Group Cursor", 
  "Unknown", 
  "Group Icon",
  "Unknown",
  "Version", "Dialog Include",
  "Unknown",
  "Plug&Play", "VXD", "Animated Cursor", "Animated Icon",
  "HTML", "Manifest"];

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

      this.Signature = reader.ReadBytes(2, true);
      this.ExtraBytes = reader.ReadUInt16(true);
      this.Pages = reader.ReadUInt16(true);
      this.RelocItems = reader.ReadUInt16(true);
      this.HeaderSize = reader.ReadUInt16(true);
      this.MinAlloc = reader.ReadUInt16(true);
      this.MaxAlloc = reader.ReadUInt16(true);
      this.InitSS = reader.ReadUInt16(true);
      this.InitSP = reader.ReadUInt16(true);
      this.Checksum = reader.ReadUInt16(true);
      this.InitIP = reader.ReadUInt16(true);
      this.InitCS = reader.ReadUInt16(true);
      this.RelocTable = reader.ReadUInt16(true);
      this.Overlay = reader.ReadUInt16(true);

      reader.ReadBytes(8); // Reserved space

      this.OemIdentifier = reader.ReadUInt16(true);
      this.OemInfo = reader.ReadUInt16(true);

      reader.ReadBytes(20); // Reserved space

      this.PEHeaderStart = reader.ReadUInt32(true);

      this.Signature.Formatter = Utils.BytesToString;
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
    this.Magic = reader.ReadBytes(4, true);
    this.Machine = reader.ReadUInt16(true);
    this.NumberOfSections = reader.ReadUInt16(true);
    this.TimeDateStamp = reader.ReadUInt32(true);
    this.PointerToSymbolTable = reader.ReadUInt32(true);
    this.NumberOfSymbols = reader.ReadUInt32(true);
    this.SizeOfOptionalHeader = reader.ReadUInt16(true);
    this.Characteristics = reader.ReadUInt16(true);

    this.Magic.Formatter = Formatters.HexAndText;
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
      this.Magic = reader.ReadBytes(2, true);
      var uintMagic = Utils.ToUInt32(this.Magic.Value);

      var magicKnown =
        uintMagic == PE_OPTIONAL_MAGIC.PE32 ||
        uintMagic == PE_OPTIONAL_MAGIC.PE32_PLUS;

      if (!magicKnown) throw("Unknown magic number in PE optional header");

      var bit32 = uintMagic == PE_OPTIONAL_MAGIC.PE32;

      this.MajorLinkerVersion = reader.ReadByte(true);
      this.MinorLinkerVersion = reader.ReadByte(true);
      this.SizeOfCode = reader.ReadUInt32(true);
      this.SizeOfInitializedData = reader.ReadUInt32(true);
      this.SizeOfUninitializedData = reader.ReadUInt32(true);
      this.AddressOfEntryPoint = reader.ReadUInt32(true);
      this.BaseOfCode = reader.ReadUInt32(true);
      this.BaseOfData = bit32 ? reader.ReadUInt32(true) : 0;

      this.ImageBase = bit32 ? reader.ReadUInt32(true) : reader.ReadUInt64(true);
      this.SectionAlignment = reader.ReadUInt32(true);
      this.FileAlignment = reader.ReadUInt32(true);
      this.MajorOperatingSystemVersion = reader.ReadUInt16(true);
      this.MinorOperatingSystemVersion = reader.ReadUInt16(true);
      this.MajorImageVersion = reader.ReadUInt16(true);
      this.MinorImageVersion = reader.ReadUInt16(true);
      this.MajorSubsystemVersion = reader.ReadUInt16(true);
      this.MinorSubsystemVersion = reader.ReadUInt16(true);
      this.Win32VersionValue = reader.ReadUInt32(true);
      this.SizeOfImage = reader.ReadUInt32(true);
      this.SizeOfHeaders = reader.ReadUInt32(true);
      this.CheckSum = reader.ReadUInt32(true);
      this.Subsystem = reader.ReadUInt16(true);
      this.DllCharacteristics = reader.ReadUInt16(true);
      this.SizeOfStackReserve = bit32 ? reader.ReadUInt32(true) : reader.ReadUInt64(true);
      this.SizeOfStackCommit = bit32 ? reader.ReadUInt32(true) : reader.ReadUInt64(true);
      this.SizeOfHeapReserve = bit32 ? reader.ReadUInt32(true) : reader.ReadUInt64(true);
      this.SizeOfHeapCommit = bit32 ? reader.ReadUInt32(true) : reader.ReadUInt64(true);
      this.LoaderFlags = reader.ReadUInt32(true);
      this.NumberOfRvaAndSizes = reader.ReadUInt32(true);

      this.directoryEntries = []; //new DataDirectoryEntry[NumberOfRvaAndSizes];
      this.directoryEntries.toString = () => this.directoryEntries.join(", ");

      var directoryNames = [
        "Exports", "Imports", "Resources", "Exceptions",
        "Certificates", "Base Relocations", "Debug", "Architecture",
        "Global Pointer", "Thread Local Storage", "Load Config", "Bound Import",
        "Import Address Table", "Delay Import Descriptor", "CLR Runtime Header", "Reserved"
      ];

      for (let i = 0; i < this.NumberOfRvaAndSizes; i++) {
          this.directoryEntries[i] = new DataDirectoryEntry(
              directoryNames[i],
              reader.ReadUInt32(true),
              reader.ReadUInt32(true));
          /////
          // streamMap.JumpTo(directoryEntries[i].RelativeVirtualAddress);
          // directoryEntries[i].data =
          //     reader.ReadBytes((int)directoryEntries[i].SizeOfDirectory);
          // directoryEntries[i].dataStr = ASCIIEncoding.ASCII.GetString(directoryEntries[i].data);
          // streamMap.JumpBack();
          /////
      }

      
      this.Magic.Formatter = Formatters.PEMagic;
      this.AddressOfEntryPoint.Formatter = Formatters.Hex;

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
      this.VirtualAddress.Value,
      this.SizeOfRawData.Value,
      this.PointerToRawData.Value);
  }

  ReadFromStream(reader) {
      this.Name = reader.ReadFixedLengthString(8, true, true); // reader.ReadBytes(8).map(x => String.fromCharCode(x)).join("");
      this.VirtualSize = reader.ReadUInt32(true);
      this.VirtualAddress = reader.ReadUInt32(true);
      this.SizeOfRawData = reader.ReadUInt32(true);
      this.PointerToRawData = reader.ReadUInt32(true);
      this.PointerToRelocations = reader.ReadUInt32(true);
      this.PointerToLineNumbers = reader.ReadUInt32(true);
      this.NumberOfRelocations = reader.ReadUInt16(true);
      this.NumberOfLineNumbers = reader.ReadUInt16(true);
      this.Characteristics = reader.ReadUInt32(true);

      this.VirtualAddress.Formatter = Formatters.Hex;
      this.PointerToRawData.Formatter = Formatters.Address;
  }
}

class Import {
  ByOrdinal;
  // Ordinal;
  // ImportName;
  // ImportNameLoc;

  constructor(code, bit64 = false) {
    var HIGH_BIT = bit64 ? 0x8000000000000000 : 0x80000000;
    this.ByOrdinal = code >= HIGH_BIT;
    if (this.ByOrdinal) {
      this.Ordinal = code % 0x10000;
    } else {
      this.ImportNameLoc = code % 0x100000000;
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
    this.DllName = this._reader.ReadNTString(true);
    this._reader.JumpBack();
  }

  constructor(reader, bit64 = false) {
      this._reader = reader;
      this.ImportLookupTableRVA = this._reader.ReadUInt32(true);
      this.Timestamp = this._reader.ReadUInt32(true);
      this.ForwarderChain = this._reader.ReadUInt32(true);
      this.NameRVA = this._reader.ReadUInt32(true);
      this.ImportAddressTableRVA = this._reader.ReadUInt32(true);
      this._bit64 = bit64;
      this.ResolveDllName();

      if (this.IsEmpty()) return;

      this._reader.JumpTo(this.ImportLookupTableRVA);
      this.Imports = this.ReadImports();
      this._reader.JumpBack();

  }

  ReadImports() {
      var imports = [];
      var importEntry = this._bit64 ?
        this._reader.ReadUInt64(true) :
        this._reader.ReadUInt32(true);
      while (importEntry != 0) {
          var importItem = new Import(importEntry, this._bit64);
          /// Messy
          this._reader.JumpTo(importItem.ImportNameLoc);
          this._reader.ReadUInt16(true); //// TODO: Use this.. this is the "hint" part of the hint table
          importItem.ImportName = this._reader.ReadNTString(true);
          if (this._reader.Position % 2 == 1) this._reader.ReadByte(true);
          this._reader.JumpBack();
          ///
          imports.push(importItem);
          importEntry = this._bit64 ?
            this._reader.ReadUInt64(true) :
            this._reader.ReadUInt32(true);

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
      var dllName = reader.ReadNTString(true);
      reader.JumpBack();
      return dllName;
  }

  _getExports(reader) {
      reader.JumpTo(this.NamePointerRVA);
      var exports = [];
      for (let i = 0; i < this.NumNamePointers; i++) {
          // Get name
          reader.JumpTo(this.NamePointerRVA + i * 4, false);
          reader.JumpTo(reader.ReadInt32(true), false);
          var s = reader.ReadNTString(true);

          // Get ordinal
          reader.JumpTo(this.OrdinalTableRVA + i * 2, false);
          var o = reader.ReadInt16(true);

          // Get address
          reader.JumpTo(this.ExportAddressTableRVA + o * 4, false);
          var rva = reader.ReadInt32(true);
          exports.push(new Export(s, rva));
      }
      reader.JumpBack();
      return exports;
  }

  ReadFromStream(reader) {
    this.ExportFlags = reader.ReadUInt32(true);
    this.Timestamp = reader.ReadUInt32(true);
    this.MajorVersion = reader.ReadUInt16(true);
    this.MinorVersion = reader.ReadUInt16(true);
    this.NameRVA = reader.ReadUInt32(true);
    this.OrdinalBase = reader.ReadUInt32(true);
    this.AddressTableEntries = reader.ReadUInt32(true);
    this.NumNamePointers = reader.ReadUInt32(true);
    this.ExportAddressTableRVA = reader.ReadUInt32(true);
    this.NamePointerRVA = reader.ReadUInt32(true);
    this.OrdinalTableRVA = reader.ReadUInt32(true);

    this.DllName = this._getName(reader);
    this.Exports = this._getExports(reader);
  }

}

class ResourceDirectoryTable {

  NestLevel;
  ResourceType;

  constructor(reader, address, resourceBaseAddress, nestLevel = 0, resourceType = "Unknown") {
    this.NestLevel = nestLevel;
    this.ResourceType = resourceType;
    if (!resourceBaseAddress) resourceBaseAddress = address;
    this.ReadFromStream(reader, address, resourceBaseAddress);
  }

  ReadFromStream(reader, address, resourceBaseAddress) {
    reader.JumpTo(address, true, false);
    this.Characteristics = reader.ReadUInt32();
    this.TimeDateStamp = reader.ReadUInt32();
    this.MajorVersion = reader.ReadUInt16();
    this.MinorVersion = reader.ReadUInt16();
    this.NumberOfNameEntries = reader.ReadUInt16();
    this.NumberOfIDEntries = reader.ReadUInt16();
    this.Entries = [];
    for (let i = 0; i < this.NumberOfNameEntries; i++) {
      this.Entries.push(new ResourceDirectoryEntry(reader, resourceBaseAddress, this.NestLevel, this.ResourceType));
    }
    for (let i = 0; i < this.NumberOfIDEntries; i++) {
      this.Entries.push(new ResourceDirectoryEntry(reader, resourceBaseAddress, this.NestLevel, this.ResourceType));
    }
    reader.JumpBack();
  }

}

class ResourceDirectoryEntry {

  IsNamed;
  Name;
  ID;
  IsLeaf;
  Child;
  NestLevel;
  ResourceType;

  constructor(reader, resourceBaseAddress, nestLevel = 0, resourceType = "Unknown") {
    this.NestLevel = nestLevel;
    this.ResourceType = resourceType;
    this.ReadFromStream(reader, resourceBaseAddress);
  }

  ReadName(reader, address) {
    reader.JumpTo(address, true, false);
    var stringLength = reader.ReadUInt16();
    var strBytes = [];
    for (let i = 0; i < stringLength * 2; i++) {
      strBytes.push(reader.ReadByte());
    }
    reader.JumpBack();
    return Utils.DecodeUtf16(strBytes);
  }

  ReadFromStream(reader, resourceBaseAddress) {
    var HIGH_BIT = 0x80000000;
    var id = reader.ReadUInt32();

    this.IsNamed = id >= HIGH_BIT;
    if (this.IsNamed) {
      id -= HIGH_BIT;
      this.Name = this.ReadName(reader, resourceBaseAddress + id);
    } else {
      this.ID = id;
    }

    // Level 0 is apparently special, and determines the type of resource
    if (this.NestLevel == 0) {
      this.ResourceType = this.IsNamed ? this.Name : resourceTypes[this.ID];
    }
    
    var dataAddress = reader.ReadUInt32();
    this.IsLeaf = dataAddress < HIGH_BIT;
    if (dataAddress >= HIGH_BIT) dataAddress -= HIGH_BIT;
    this.Child = this.IsLeaf ?
      new ResourceDataEntry(reader, resourceBaseAddress + dataAddress, this.ResourceType) :
      new ResourceDirectoryTable(reader, resourceBaseAddress + dataAddress, resourceBaseAddress, this.NestLevel + 1, this.ResourceType);
  }

}

class ResourceDataEntry {

  reader;
  DataRVA;
  Size;
  Codepage;

  Name;
  Extension;
  ResourceHandler;

  constructor(reader, address, resourceType = "Unknown") {
    this.ReadFromStream(reader, address);
    this.ResourceType = resourceType;
    
    var resourceHandler = ResourceHandlers[resourceType];
    this.ResourceHandler = resourceHandler ?? ResourceHandlers.Default;
    this.ResourceHandler.bind(this);
  }

  ReadFromStream(reader, address) {
    this.reader = reader;
    reader.JumpTo(address, true, false);
    this.DataRVA = reader.ReadUInt32();
    this.Size = reader.ReadUInt32();
    this.Codepage = reader.ReadUInt32();
    reader.ReadUInt32(); // Reserved
    reader.JumpBack();
  }

  Extract() {
    this.reader.JumpTo(this.DataRVA, true, true);
    var data = this.reader.ReadBytes(this.Size);
    this.reader.JumpBack();
    return data;
  }

  Download() {
    var data = this.Extract();
    var blob = new Blob([new Uint8Array(data)], {type: "octet/stream"});
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    a.href = url;
    a.download = (this.Name ?? "Resource") + extension;
    a.click();
    window.URL.revokeObjectURL(url);
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

  ReadResources() {
    var resourceSection = this.GetSection(".rsrc");
    if (resourceSection == null) return;
    var baseAddr = resourceSection.PointerToRawData.Value;
    return new ResourceDirectoryTable(this._reader, baseAddr);
  }

  GetSection(name) {
    var s = this.SectionHeaders.filter(x => x.Name.Value.toLowerCase() == name);
    if (s.length > 1) throw("More than one section called " + name);
    if (s.length == 0) return null;
    return s[0];
  }

  Find(data, start = 0) {
    if (typeof data === "string") {
      data = data.split("").map(x => x.charCodeAt(0))
    }
    var len = this._reader._data.length - data.length;
    for (let i = start; i < len; i++) {
      let j = 0;
      while (this._reader._data[i+j] == data[j]) {
        j++;
        if (j == data.length) return i;
      }
    }
    return -1;
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
    this.Resources = this.ReadResources();
  }

}

class VS_VERSIONINFO {

    reader;
    resourceSize;
    valueDataSize;
    valueType;
    identifierString;
    alignPadding;
    version;
    alignPadding;	
    versionSubVals;
  
    constructor(reader, address) {
      this.ReadFromStream(reader, address);
    }
  
    ReadFromStream(reader, address) {
      this.reader = reader;
      // Only jump if address specified
      if (address != null) reader.JumpTo(address, true, false);
      this.ResourceSize = reader.ReadUInt16();
      this.valueDataSize = reader.ReadUInt32();
      this.valueType;
      this.identifierString = Utils.DecodeUtf16(reader.ReadBytes(32));
      reader.ReadBytes(4 - reader.Position % 4); // Padding
      this.version = new VS_FIXEDFILEINFO(reader);
      reader.ReadBytes(4 - reader.Position % 4); // Padding
      // this.versionSubVals = ... TODO!
      if (address != null) reader.JumpBack();
    }
  
  }

class VS_FIXEDFILEINFO {
  reader;

  Signature;
  StrucVersion;
  FileVersionMS;
  FileVersionLS;
  ProductVersionMS;
  ProductVersionLS;
  FileFlagsMask;
  FileFlags;
  _fileOS;
  get FileOS() { return this.DecodeFileOS(); };
  FileType;
  FileSubtype;
  FileDateMS;
  FileDateLS;

  constructor(reader, address) {
    this.ReadFromStream(reader, address);
  }

  ReadFromStream(reader, address) {
    this.reader = reader;
    // Only jump if address specified
    if (address != null) reader.JumpTo(address, true, false);

    this.Signature = reader.ReadUInt32();
    this.StrucVersion = reader.ReadUInt32();
    this.FileVersionMS = reader.ReadUInt32();
    this.FileVersionLS = reader.ReadUInt32();
    this.ProductVersionMS = reader.ReadUInt32();
    this.ProductVersionLS = reader.ReadUInt32();
    this.FileFlagsMask = reader.ReadUInt32();
    this.FileFlags = reader.ReadUInt32();
    this._fileOS = reader.ReadUInt32();
    this.FileType = reader.ReadUInt32();
    this.FileSubtype = reader.ReadUInt32();
    this.FileDateMS = reader.ReadUInt32();
    this.FileDateLS = reader.ReadUInt32();
    
    if (address != null) reader.JumpBack();
  }

  DecodeFileOS() {
    if (this._fileOS == 0) return "Unknown";
    var os = [];
    var b1 = (this._fileOS & 0xFF0000) >> 16;
    var b2 = this._fileOS & 0xFF;
    switch (b1) {
      case 1: os.push("DOS"); break;
      case 2: os.push("16-bit OS/2"); break;
      case 3: os.push("32-bit OS/2"); break;
      case 4: os.push("NT"); break;
    }
    switch (b2) {
      case 1: os.push("16-bit Windows"); break;
      case 2: os.push("16-bit Presentation Manager"); break;
      case 3: os.push("32-bit Presentation Manager"); break;
      case 4: os.push("32-bit Windows"); break;
    }
    return os.join(", ");
  }

}

class MUIFILETYPE {
  
  _MUI_FILETYPE_NOT_LANGUAGE_NEUTRAL = 1;
  _MUI_FILETYPE_LANGUAGE_NEUTRAL_MAIN = 2;
  _MUI_FILETYPE_LANGUAGE_NEUTRAL_MUI = 4;
  Value;

  constructor(lType) {
    this.Value = lType;
  }

  toString() {
    switch(this.Value) {
      case this._MUI_FILETYPE_NOT_LANGUAGE_NEUTRAL: 
        return "Non-split resource file";
      case this._MUI_FILETYPE_LANGUAGE_NEUTRAL_MAIN: 
        return "Language-neutral main module";
      case this._MUI_FILETYPE_LANGUAGE_NEUTRAL_MUI: 
        return "Language-neutral MUI file";
      default: 
        return "Unknown";
    }
  }
}

class FILEMUIINFO
{
    Size;
    Version;
    FileType;
    Checksum;
    ServiceChecksum;
    LanguageNameOffset;
    TypeIDMainSize;
    TypeIDMainOffset;
    TypeNameMainOffset;
    TypeIDMUISize;
    TypeIDMUIOffset;
    TypeNameMUIOffset;
    Buffer;

    constructor(reader, address) {
      this.ReadFromStream(reader, address);
    }
  
    ReadFromStream(reader, address) {

      this.reader = reader;
      // Only jump if address specified
      if (address != null) reader.JumpTo(address, true, false);
  
      if (reader.ReadUInt32() != 0xfecdfecd) throw("Invalid FILEMUIINFO signature!");
      this.Size = reader.ReadUInt32();
      this.Version = reader.ReadUInt32();
      this.FileType = new MUIFILETYPE(reader.ReadUInt32());
      this.Checksum = reader.ReadBytes(16);
      this.ServiceChecksum = reader.ReadBytes(16);
      this.LanguageNameOffset = reader.ReadUInt32();
      this.TypeIDMainSize = reader.ReadUInt32();
      this.TypeIDMainOffset = reader.ReadUInt32();
      this.TypeNameMainOffset = reader.ReadUInt32();
      this.TypeIDMUISize = reader.ReadUInt32();
      this.TypeIDMUIOffset = reader.ReadUInt32();
      this.TypeNameMUIOffset = reader.ReadUInt32();
      this.Buffer = reader.ReadBytes(8);
      
      if (address != null) reader.JumpBack();
    }

    
  }

  