// 0x06 = Exports table


class NetDll {

  reader;

  cliHeaderSize;
  clrMajorVersion;
  clrMinorVersion;
  metadataRVA;
  metadataSize;
  assemblyFlags;
  entryPointTable;
  entryPointIndex;

  stringHeap;
  metadataStream;

  // TODO: Rest of header

  GetStream(name) {
    return this.metadataHeader.streams.find(x => x.name == name);
  }

  ResolveString(position) {
    var root = this.reader.MapAddress(this.cliHeader.metadataRVA);
    var offset = this.GetStream("#Strings").offset;
    this.reader.JumpTo(root + offset + position, true, false);
    var str = this.reader.ReadNTString();
    this.reader.JumpBack();
    return str;
  }

  constructor(exeFile) {

    this.reader = exeFile._reader;
    var textSection = exeFile.SectionHeaders.find(x => x.Name == ".text");
    if (!textSection) throw ("No .text section found");

    var address = textSection.PointerToRawData.Value;
    this.reader.JumpTo(address, true, false);
    this.cliHeader = new CliHeader(this.reader);

    // Move to the metadata
    if (this.reader.MapAddress(this.cliHeader.metadataRVA) > this.reader.Length)
      throw("The metadata RVA seems to be invalid");
    this.reader.JumpTo(this.cliHeader.metadataRVA, false, true);
    this.metadataHeader = new MetadataHeader(this.reader);

    // Get the content of the #Strings stream
    var metadataRoot = this.reader.MapAddress(this.cliHeader.metadataRVA);
    var stringStreamInfo = this.GetStream("#Strings");
    var stringAddress = metadataRoot + stringStreamInfo.offset;
    this.reader.JumpTo(stringAddress, false, false);
    this.stringHeap = new StringHeap(this.reader, stringStreamInfo.size);

    // Get the content of the #~ stream
    var metadataStreamInfo = this.GetStream("#~");
    var metadataStreamAddress = metadataRoot + metadataStreamInfo.offset;
    this.reader.JumpTo(metadataStreamAddress, false, false);
    this.metadataStream = new MetadataStream(this.reader);
    this.metadataStream.ResolveStrings(this.ResolveString.bind(this));

    this.reader.JumpBack();
  }

}

class CliHeader {

  cliHeaderSize;
  clrMajorVersion;
  clrMinorVersion;
  metadataRVA;
  metadataSize;
  assemblyFlags;
  entryPointIndex;
  entryPointTable;

  // TODO: Rest of header

  constructor(reader) {
    var usedByCLR = reader.ReadBytes(8);
    this.cliHeaderSize = reader.ReadUInt32();
    this.clrMajorVersion = reader.ReadUInt16();
    this.clrMinorVersion = reader.ReadUInt16();
    this.metadataRVA = reader.ReadUInt32(); // This is the memory address (not the file address) 
    this.metadataSize = reader.ReadUInt32();
    this.assemblyFlags = reader.ReadBytes(4);
    this.entryPointIndex = Utils.ToUInt32(reader.ReadBytes(3));
    this.entryPointTable = reader.ReadByte();
  }

}

class MetadataHeader {

  magic;
  metadataMajorVersion;
  metadataMinorVersion;
  versionString;
  streams = [];

  constructor(reader) {

    this.magic = reader.ReadUInt32();
    if (this.magic != 0x424a5342) throw("Invalid metadata header");
    this.metadataMajorVersion = reader.ReadUInt16();
    this.metadataMinorVersion = reader.ReadUInt16();
    var reservedBytes = reader.ReadBytes(4);
    var versionLength = reader.ReadUInt32();
    this.versionString = Utils.BytesToString(reader.ReadBytes(versionLength));
    reader.AlignToNext(4);
    reservedBytes = reader.ReadBytes(2);

    var numStreams = reader.ReadUInt16();
    for (let i = 0; i < numStreams; i++) {
      this.streams.push({
        offset: reader.ReadUInt32(),
        size: reader.ReadUInt32(),
        name: reader.ReadNTString()
      });
      reader.AlignToNext(4);
    }

  }

}

class MetadataStream {

  schemaMajorVersion;
  schemaMinorVersion;
  heapSizes = [];
  presentTables;
  sortedTables;
  numRows;
  tables;

  #bitVecToBooleanArray(bitVec) {
    var boolArray = [];
    var j = 0;
    for (let b of bitVec) {
      for (let i = 0; i < 8; i++) {
        var present = (b & 0x01) == 0x01;
        if (present) b -= 0x01;
        b >>= 1;
        boolArray[j++] = present;
      }
    }
    return boolArray;
  }

  #parseHeapSizes(bitVec) {
    var bArr = this.#bitVecToBooleanArray([bitVec]);
    return {
      "#Strings": bArr[0] * 2 + 2,
      "#GUID": bArr[1] * 2 + 2,
      "#Blob": bArr[2] * 2 + 2
    }
  }

  constructor(reader) {
    reader.ReadBytes(4); // Reserved
    this.schemaMajorVersion = reader.ReadByte();
    this.schemaMinorVersion = reader.ReadByte();
    this.heapSizes = this.#parseHeapSizes(reader.ReadByte());
    reader.ReadByte(); // Reserved
    
    var presentTablesBitVec = reader.ReadBytes(8);
    var sortedTablesBitVec = reader.ReadBytes(8);

    this.presentTables = this.#bitVecToBooleanArray(presentTablesBitVec);
    this.sortedTables = this.#bitVecToBooleanArray(sortedTablesBitVec);

    this.numRows = [];
    for (var idx in this.presentTables) {
      var tablePresent = this.presentTables[idx];
      if (tablePresent) this.numRows[idx] = reader.ReadUInt32();
    }

    this.tables = {};

    this.tables.Module = new Tables[Consts.SCHEMA_INDICES[0]](reader, this.numRows[0]);
    this.tables.TypeRef = new Tables[Consts.SCHEMA_INDICES[1]](reader, this.numRows[1]);
    this.tables.TypeDef = new Tables[Consts.SCHEMA_INDICES[2]](reader, this.numRows[2]);
    this.tables.Method = new Tables[Consts.SCHEMA_INDICES[6]](reader, this.numRows[6]);
  }

  ResolveStrings(resolverFn) {
    for (let tableName of Object.keys(this.tables)) {
      var table = this.tables[tableName];
      if (table.ResolveStrings) table.ResolveStrings(resolverFn);
    }
  }

}

class StringHeap {

  reader
  strings = [];

  constructor(reader, size) {
    var endPos = reader.Position + size;
    while (reader.Position < endPos) {
      this.strings.push(reader.ReadNTString());
    }
  }

}

var netDll;

function NetExperiment() {
  
  netDll = new NetDll(globals.exeFile);
  
}


// SCHEMATA...

Tables = {

  Module: class {

    generation
    nameIdx;
    mvidIdx;
    name;
    mvid;
    encId;
    encBaseId;

    constructor(reader, numRows) {
      if (numRows != 1) throw("The module table MUST have exactly one row");

      this.generation = reader.ReadBytes(2); // Currently reserved to be zero
      this.nameIdx = reader.ReadUInt16();
      this.mvidIdx = reader.ReadUInt16();
      this.encId = reader.ReadUInt16(); // Currently reserved to be zero
      this.encBaseId = reader.ReadUInt16(); // Currently reserved to be zero
    }

    ResolveStrings(resolverFn) {
      this.name = resolverFn(this.nameIdx);
      this.mvid = resolverFn(this.mvidIdx);
    }

  },

  TypeRef: class {

    rows = [];

    // TODO: don't default indexSize
    constructor(reader, numRows, indexSize = 2) {
      for (let i = 0; i < numRows; i++) {
        this.rows.push({
          resolutionScopeIdx: reader.ReadUInt16(),
          typeNameIdx: reader.ReadUInt16(),
          typeNamespaceIdx: reader.ReadUInt16()
        });
      }
    }

    ResolveStrings(resolverFn) {
      for (let row of this.rows) {
        row.typeName = resolverFn(row.typeNameIdx);
        row.typeNamespace = resolverFn(row.typeNamespaceIdx);
      }
    }

  },

  TypeDef: class {

    rows = [];

    // TODO: don't default indexSize
    constructor(reader, numRows, indexSize = 2) {
      for (let i = 0; i < numRows; i++) {
        this.rows.push({
          flags: reader.ReadUInt32(),
          typeNameIdx: reader.ReadUInt16(),
          typeNamespaceIdx: reader.ReadUInt16(),
          extends: reader.ReadUInt16(),
          fieldList: reader.ReadUInt16(),
          methodList: reader.ReadUInt16()
        });
      }
    }

    ResolveStrings(resolverFn) {
      for (let row of this.rows) {
        row.typeName = resolverFn(row.typeNameIdx);
        row.typeNamespace = resolverFn(row.typeNamespaceIdx);
      }
    }

  },

  Method: class {

    rows = [];

    // TODO: don't default indexSize
    constructor(reader, numRows, indexSize = 2) {
      for (let i = 0; i < numRows; i++) {
        this.rows.push({
          rva: reader.ReadUInt32(),
          implFlags: reader.ReadUInt16(),
          flags: reader.ReadUInt16(),
          nameIdx: reader.ReadUInt16(),
          signatureIdx: reader.ReadUInt16(),
          paramList: reader.ReadUInt16()
        });
      }
    }

    ResolveStrings(resolverFn) {
      for (let row of this.rows) {
        row.name = resolverFn(row.nameIdx);
      }
    }

  }

}


// TODO: Maybe split Method into TinyMethod and FatMethod?
class Method {

  flags;
  format;

  headerSize;
  maxStack;
  codeSize;
  localVarSigTok;

  code;

  constructor(reader) {
    //debugger;
    this.flags = reader.ReadByte();
    var format = this.flags & 0x03;
    if (format == Consts.METHOD_TYPE.TINY) {
      this.codeSize = this.flags >> 2;
    } else if (format == Consts.METHOD_TYPE.FAT) {
      this.flags = this.flags + (reader.ReadByte() << 8);
      this.headerSize = this.flags >> 12;
      this.maxStack = reader.ReadUInt16();
      this.codeSize = reader.ReadUInt32();
      this.localVarSigTok = reader.ReadUInt32();
    } else {
      throw("Unrecognised method format");
    }
    this.code = reader.ReadBytes(this.codeSize);
  }

}