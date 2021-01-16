// TODO:
//  - Generalise setting of registers / memory using ModRM
//  - Try to combine similar operations (not too important)
//  - Maybe never use int32s - just registers?
//  - ...

var Utils = {
  ToSignedByte: function(byte) {
    if (byte < 0 || byte > 255) throw("Invalid byte value");
    return byte - (byte > 128 ? 256 : 0);
  },

  ToInt32: function(uInt32) {
    return uInt32 | 0;
  },

  ToLEBytes(value, size = 4) {
    var v = value;
    var bt = [];
    for (let i = 0; i < size; i++) {
      var b = v % 256;
      bt.push(b);
      v = (v - b) / 256;
    }
    return bt;
  },

  ToUInt32(bytes) {
    if (bytes.length > 4) throw("More than 4 bytes provided in ToUInt32!");
    var val = 0, exp = 1;
    for (let i = 0; i < bytes.length; i++) {
      val += (bytes[i] ?? 0) * exp;
      exp *= 256;
    }
    return val;
  }
}

class MemoryMap {
  Start; End; Owner

  constructor(start, end, owner) {
    if (start >= end) throw("Bad map definition!");
    this.Start = start;
    this.End = end;
    this.Owner = owner;
  }

  Overlaps(map) {
    var b1 = this.Start > map.Start && this.Start < map.End;
    var b2 = this.End   > map.Start && this.End   < map.End;
    return (b1 || b2);
  }
}

var globalMemory = [];
class Memory {
  memory = [];
  maps = [];
  globalInds = [];
  localInds = [];

  Allocate(size, processId = 0) {
    var start = this.maps[this.maps.length - 1].End + 1; // This is disgusting
    var map = new MemoryMap(start, start + size, processId);
    if (processId == 0) {
      this.globalInds.push(maps.length);
    } else {
      this.localInds.push(maps.length);
    }
    this.maps.push(map);
  }

}

ExternalFunctions = {
  OpenClipboard: function() {
    return 0x01;
  },

  GetClipboardData: function(uFormat) {
    var handle = 0x1234;
    return handle;
  },

  GlobalLock: function(hMem) {
    var memAddress = 0x800000;
    return memAddress;
  },

  GlobalUnlock: function(hMem) {
    return 0x01;
  },

  EmptyClipboard: function() {
    return 0x01;
  },

  SetClipboardData: function(uFormat, hMem) {
    console.log("SET CLIP: " + uFormat + " " + hMem);
    return 0x01;
  },

  CloseClipboard: function() {
    return 0x01;
  },

  ExitProcess: function() {
    return 0x01;
  }
}



class Sib {

  _machine;
  Scale; Index; Base;

  constructor(machine, byte) {
    this._machine = machine;
    this.Scale = byte >> 6 & 0x03;
    this.Index = byte >> 3 & 0x07;
    this.Base =  byte      & 0x07;
  }

  Evaluate() {
    var b = (this.Base == 0x05) ? 0 : this._machine.getRegister(this.Base);
    var i = (this.Index == 0x04) ? 0 : (this._machine.getRegister(this.Index) << this.Scale);
    return b + i;
  }
  
}

// Generalised object, that either points to an address, or a register
class Target {
  type; value; offset;

  Resolve(machine) {

  }
}

class ModRM {

  _machine;
  Mod; Reg; RM; Target;

  constructor(machine, byte) {
    this._machine = machine;
    this.Mod = byte >> 6 & 0x03;
    this.Reg = byte >> 3 & 0x07;
    this.RM  =  byte     & 0x07;
    this.Target = this.evaluateTarget();
  }

  evaluateTarget() {
    if (this.Mod == 0x00) {
      switch (this.RM) {
        case 0x04:
          var sib = new Sib(this._machine, this.NextByte());
          return { type: "address", value: sib.Evaluate() };
        case 0x05:
          return { type: "address", value: this._machine.NextUInt32() };
        default: 
          return { type: "address", value: this._machine.getRegister(this.RM) };
      }
    } else if (this.Mod == 0x01 || this.Mod == 0x02) {
      var base = 0;
      // Special case for RM = 100b
      if (this.RM == 0x04) {
        var sib = new Sib(this._machine, this._machine.NextByte());
        base = sib.Evaluate();
      } else {
        base = this._machine.getRegister(this.RM);
      }
      this.Disp = (this.Mod == 0x01) ?
        Utils.ToSignedByte(this._machine.NextByte()) :
        Utils.ToInt32(this._machine.NextUInt32());
      return { type: "address", value: base + this.Disp };
    } else {
      return { type: "register", value: this.RM };
    }
  }
  
}

class Machine {

  _reader;
  _memory;
  _file;

  _regMap = this.createMap(
    ["eax", "ecx", "edx", "ebx",
     "esp", "ebp", "esi", "edi",
     "ss",  "cs",  "ds",  "es",  "fs",  "gs", 
     "eflags", "eip"]);

  _regs = {
    eax: 0x0, ecx: 0x0, edx: 0x0, ebx: 0x0,
    esp: 0x0, ebp: 0x0, esi: 0x0, edi: 0x0,
    ss:  0x0, cs:  0x0, ds:  0x0, es:  0x0, fs:  0x0, gs:  0x0, 
    eflags: 0x0, eip: 0x0
  }

  _flagMap = this.createMap(
    ["CF",      ,  "PF",
         ,  "AF",       , "ZF",
     "SF",  "TF",   "IF",  "DF",
     "OF",  "IOPL", "NT",       ,
     "RF",  "VM",   "AC",  "VIF",
     "VIP", "ID"]);

  createMap(names) {
    var m = {};
    for (let i = 0; i < names.length; i++) {
      if (names[i] != undefined && names[i] != "")
        m[names[i]] = i;
    }
    return m;
  }

  getRegister(index) {
    if (typeof index === "number") index = Object.keys(this._regs)[index];
    return this._regs[index];
  }
  setRegister(index, value) {
    if (typeof index === "number") index = Object.keys(this._regs)[index];
    this._regs[index] = value;
  }

  getFlag(flagIndex) {
    if (flagIndex > 30) throw("Unsupported flag position (why do you even need this?)");
    var flagMask = 1 << flagIndex;
    return (this._regs.eflags & flagMask) == flagMask;
  }

  setFlag(flagIndex, value) {
    if (flagIndex > 30) throw("Unsupported flag position (why do you even need this?)");
    var flagMask = 1 << flagIndex;
    var antiFlagMask = 0xffffffff - flagMask;
    this._regs.eflags &= antiFlagMask;
    this._regs.eflags |= (flagMask * value);
  }

  constructor(reader, memsize = 536870912) { // Half a gigabyte
    this._reader = reader;
    this._memory = Array(memsize);
  }

  LoadSection(sectionHeader) {
    this._reader.JumpTo(sectionHeader.PointerToRawData);
    var length = sectionHeader.SizeOfRawData;
    var virt = sectionHeader.VirtualAddress;
    for (let i = 0; i < length; i++) {
      this._memory[virt++] = this._reader.ReadByte();
    }
  }

  LoadExe(file) {
    this._file = file;
    this._regs.esp = file.MZHeader.InitSP.Value;
    this._regs.eip = file.PEOptionalHeader.AddressOfEntryPoint;
    for (let sectionHeader of file.SectionHeaders) {
      this.LoadSection(sectionHeader);
    }

    var str = "this/is/a/test\0";
    for (let i = 0; i < str.length; i++) this._memory[0x800000+i] = str.charCodeAt(i);
  }

  NextModRM(pos) {
    if (typeof pos === "undefined") {
      return new ModRM(this, this.NextByte());
    } else {
      return new ModRM(this, this.NextByte(pos));
    }
  }

  NextByte(pos) {
    if (typeof pos === "undefined") {
      return this._memory[this._regs.eip++];
    } else {
      return this._memory[pos];
    }
  }

  // TODO: Use ToUInt32 to avoid repetition
  NextUInt32(pos) {
    var val = 0, exp = 1;
    var auto = (typeof pos === "undefined");
    for (let i = 0; i < 4; i++) {
      let b = auto ? this.NextByte() : this.NextByte(pos + i);
      val += b * exp;
      exp *= 256;
    }
    return val;
  }

  NextInt32() {
    var val = this.NextUInt32();
    if (val > 2147483647) val -= 4294967296;
    return val;
  }

  OpArithmetic() { // 0x83
    // addition, subtraction etc
    var modRM = this.NextModRM();
    var op2 = this.NextByte();
    switch (modRM.Reg) {
      case 0x00: // add
        if (modRM.Target.type == "register") {
          this.setRegister(modRM.Target.value,
            this.getRegister(modRM.Target.value) + op2);
        } else {
          var addr = modRM.Target.value;
          var cv = Utils.ToUInt32(this.ReadFromMemory(4, addr));
          this.WriteToMemory(Utils.ToLEBytes(cv + op2), addr);
        }
        break;
      // case 0x01: // or
      //   break;
      // case 0x02: // adc
      //   break;
      // case 0x03: // sbb
      //   break;
      // case 0x04: // and
      //   break;
      case 0x05: // sub
        if (modRM.Target.type == "register") {
          this.setRegister(modRM.Target.value,
            this.getRegister(modRM.Target.value) - op2);
        } else {
          var cv = Utils.ToUInt32(this.ReadFromMemory(modRM.Target.value));
          this.WriteToMemory(Utils.ToLEBytes(cv - op2), modRM.Target.value);
        }
        // TODO: SET FLAGS!
        break;
      // case 0x06: // xor
      //   break;
      case 0x07: // cmp
        var op1;
        if (modRM.Target.type == "register") {
          op1 = this.getRegister(modRM.Target.value)
        } else {
          var addr = modRM.Target.value;
          op1 = Utils.ToUInt32(this.ReadFromMemory(4, addr));
        }
        var res = op1 - op2;
        var sf = (res & 0x80000000) == 0x80000000;
        this.setFlag(this._flagMap.OF, res < -2147483648);
        this.setFlag(this._flagMap.SF, sf);
        this.setFlag(this._flagMap.ZF, res == 0);
        //this.setFlag(this._flagMap.AF, ); // TODO: Set AF
        this.setFlag(this._flagMap.PF, this.Parity(res));
        this.setFlag(this._flagMap.CF, res < -2147482648); // TODO: Double check OF and CS logic

        break;
      default:
        throw("Unexpected error in OpArithmetic - Register of ModRM is invalid");
    }
  }

  // TODO: GENERALISE SETTING!!!
  OpMov(reverse = false) { //0x89 / 0x8b
    // MOV
    var modRM = this.NextModRM();
    if (!reverse) {
      var srcVal = this.getRegister(modRM.Reg);
      if (modRM.Target.type == "address") {
        var addr = modRM.Target.value;
        this.WriteToMemory(Utils.ToLEBytes(srcVal), addr);
      } else if (modRM.Target.type == "register") {
        this.setRegister(modRM.Target.value, srcVal);
      }
    } else {
      var srcVal;
      if (modRM.Target.type == "address") {
        var addr = modRM.Target.value;
        srcVal = Utils.ToUInt32(this.ReadFromMemory(4, addr));
      } else if (modRM.Target.type == "register") {
        srcVal = this.getRegister(modRM.Target.value);
      }
      this.setRegister(modRM.Reg, srcVal);
    }
  }

  // TODO: This should probably by combined with the function above (OpMov) ^^
  LEA() {
    var modRM = this.NextModRM();
    this.setRegister(modRM.Reg, modRM.Target.value);
  }

  Parity(byte) {
    var sh = 1;
    for (let i = 0; i < 3; i++) {
      byte = byte ^ (byte >> sh);
      sh <<= 1;
    }
    return !(byte & 1);
  }

  Execute() {
    var exec = true;
    var prefix = null;
    while (exec) {
      var initIP = this._regs.eip;
      var opcode = this.NextByte();
      var hex = opcode.toString(16);
      console.log((this._regs.eip - 0x1001).toString(16) + ": " + hex);
      if (opcode == 0x0f) { // These are two-bytes instructions...
        // Set CC
        var opcode2 = this.NextByte();
        if (opcode2 == 0x94) {
          // Set byte to (ZF == 1);
          var val = this.getFlag(this._flagMap.ZF);
          var modRM = this.NextModRM();
          if (modRM.Target.type == "address") {
            var bytes = this.ReadFromMemory(4, modRM.Target.value);
            bytes[1] = val;
            this.WriteToMemory(bytes, modRM.Target.value);
          } else if (modRM.Target.type == "register") {
            var cv = this.getRegister(modRM.Target.value);
            this.setRegister(modRM.Target.value, (cv - cv % 0x100) + (0xff * val));
          }
        } else if (opcode2 == 0xb6) { // MOVZX single byte - again, a mess
          debugger;
          // TODO: Use OpMov?
          var srcVal;
          var modRM = this.NextModRM();
          if (modRM.Target.type == "address") {
            var addr = modRM.Target.value;
            srcVal = Utils.ToUInt32(this.ReadFromMemory(1, addr));
          } else if (modRM.Target.type == "register") {
            srcVal = this.getRegister(modRM.Target.value, srcVal);
          }
          this.setRegister(modRM.Reg, srcVal);
        
        }
      } else if (opcode == 0x2b) {
        var modRM = this.NextModRM();
        var amount = (modRM.Target.type == "register") ?
          this.getRegister(modRM.Target.value) :
          Utils.ToUInt32(this.ReadFromMemory(4, modRM.Target.value));
        this.setRegister(modRM.Reg, this.getRegister(modRM.Reg) - amount);
      } else if (opcode == 0x31) {   // XOR r/m, r
        var modRM = this.NextModRM();
        var op1 = this.getRegister(modRM.Reg);
        if (modRM.Target.type == "register") {
          this.setRegister(modRM.Target.value,
            this.getRegister(modRM.Target.value) ^ op1);
        } else {
          var addr = modRM.Target.value;
          this.WriteToMemory(
            Utils.ToLEBytes(Utils.ToUInt32(this.ReadFromMemory(4, addr)) ^ op1), addr);
        }
      } else if (opcode == 0x33) {   // XOR r, r/m
        var modRM = this.NextModRM();
        var op1 = (modRM.Target.type == "register") ? 
          this.getRegister(modRM.Target.value) : 
          Utils.ToUInt32(this.ReadFromMemory(4, modRM.Target.value));
        this.setRegister(modRM.Reg, op1 ^ this.getRegister(modRM.Reg));
      } else if (opcode == 0x39 || opcode == 0x3b) { // CMP r, r/m
        var modRM = this.NextModRM();
        var op1 = this.getRegister(modRM.Reg);
        var op2;
        if (modRM.Target.type == "register") {
          op2 = this.getRegister(modRM.Target.value, srcVal);
        } else {
          var addr = modRM.Target.value;
          op2 = Utils.ToUInt32(this.ReadFromMemory(4, addr));
        }

        // TODO: This is done in the other CMP (0x83), don't repeat!
        var res = (opcode == 0x39) ? op2 - op1 : op1 - op2;
        var sf = res < 0; //(res & 0x80000000) == 0x80000000;
        this.setFlag(this._flagMap.OF, res < -2147482648);
        this.setFlag(this._flagMap.SF, sf);
        this.setFlag(this._flagMap.ZF, res == 0);
        //this.setFlag(this._flagMap.AF, ); // TODO: Set AF
        this.setFlag(this._flagMap.PF, this.Parity(res));
        this.setFlag(this._flagMap.CF, res < -2147482648); // TODO: Double check OF and CS logic
      } else if (opcode == 0x3c) {
        var op1 = this._regs.eax % 0x100;
        var op2 = this.NextByte();

        // TODO: REPEATING!
        var res = op1 - op2;
        var sf = res < 0; //(res & 0x80000000) == 0x80000000;
        this.setFlag(this._flagMap.OF, res < -2147482648);
        this.setFlag(this._flagMap.SF, sf);
        this.setFlag(this._flagMap.ZF, res == 0);
        //this.setFlag(this._flagMap.AF, ); // TODO: Set AF
        this.setFlag(this._flagMap.PF, this.Parity(res));
        this.setFlag(this._flagMap.CF, res < -2147482648); // TODO: Double check OF and CS logic
      } else if (opcode < 0x50) {
        debugger;
        exec = false;
      }
      else if (opcode <  0x58) this.PushRegister(opcode & 0x7);
      else if (opcode <  0x60) this.PopRegister(opcode & 0x7);
      else if (opcode == 0x64) prefix = opcode;
      else if (opcode == 0x68) this.PushToStack(Utils.ToLEBytes(this.NextUInt32()))
      else if (opcode == 0x6a) this.PushToStack(Utils.ToLEBytes(this.NextByte()));
      else if (opcode == 0x74 || opcode == 0x75) { // JE / JNE
        var offset = this.NextByte();
        var cond = (opcode == 0x74) * 1;
        if (this.getFlag(this._flagMap.ZF) == cond) {
          if (offset > 127) offset -= 256;
          this._regs.eip += offset;
        }
      }
      else if (opcode == 0x7d) { // JGE
        var offset = this.NextByte();
        if (this.getFlag(this._flagMap.SF) == this.getFlag(this._flagMap.OF)) {
          this._regs.eip += Utils.ToSignedByte(offset);
        }
      }
      else if (opcode == 0x7f) {
        // Jump short if greater ((ZF=0) AND (SF=OF))
        var offset = this.NextByte();
        var ZF = this.getFlag(this._flagMap.ZF);
        var SF = this.getFlag(this._flagMap.SF);
        var OF = this.getFlag(this._flagMap.OF);
        if (ZF == 0 && SF == OF) {
          this._regs.eip += Utils.ToSignedByte(offset);
        }
      }
      else if (opcode == 0x83) this.OpArithmetic();
      else if (opcode == 0x84 || opcode == 0x85) {
        // TEST
        var modRM = this.NextModRM();
        var val1 = this.getRegister(modRM.Reg);
        var val2 = modRM.Target.type == "address" ?
          Utils.ToUInt32(this.ReadFromMemory(4, modRM.Target.value)) :
          this.getRegister(modRM.Target.value);
        if (opcode == 0x84) {
          val1 &= 0xff;
          val2 &= 0xff;
        }
        var res = val1 & val2;
        var MSB = (opcode == 0x84) ? 0x80 : 0x80000000;
        var sf = (res & MSB) == MSB;
        var zf = res == 0;
        var pf = this.Parity(res);
        //this._regs.eflags &= 0x3b; // Turn SF, ZF and PF flags off
        this.setFlag(this._flagMap.SF, sf);
        this.setFlag(this._flagMap.ZF, zf);
        this.setFlag(this._flagMap.PF, pf);
        //this._regs.eflags |= (sf * 0x80 | zf * 0x40 | pf * 0x04); // Then turn them on as appropriate
      }
      else if (opcode == 0x89) this.OpMov();
      else if (opcode == 0x8b) this.OpMov(true);
      else if (opcode == 0x8d) this.LEA();
      else if (opcode == 0x8f) debugger; // POP
      else if (opcode == 0x90) ; // NOP
      else if (opcode == 0xa1) { // MOV EAX, moffs32
        var mOffs = this.NextUInt32();
        var reg = (prefix == 0x64) ? this._regMap.fs :
                  (prefix == 0x65) ? this._regMap.gs :
                  (prefix == null) ? this._regMap.ds : null;
        if (reg == null) throw("error");
        var base = this.getRegister(reg);
        this._regs.eax = Utils.ToUInt32(this.ReadFromMemory(4, base + mOffs));
      }
      else if (opcode == 0xa3) { // MOV moffs32, EAX
        var mOffs = this.NextUInt32();
        var reg = (prefix == 0x64) ? this._regMap.fs :
                  (prefix == 0x65) ? this._regMap.gs :
                  (prefix == null) ? this._regMap.ds : null;
        if (reg == null) throw("error");
        var base = this.getRegister(reg);
        this.WriteToMemory(Utils.ToLEBytes(this._regs.eax), base + mOffs);
      }
      else if (opcode == 0xc2) {
        // TODO: NEAR RETURNS vs FAR RETURNS
        this._regs.eip = Utils.ToUInt32(this.PopFromStack());
      }
      else if (opcode == 0xc3) {  // RET (near)
        this._regs.eip = Utils.ToUInt32(this.PopFromStack());
      }
      else if (opcode == 0xc6 || opcode == 0xc7) {
        // TODO: Combine with 0x89 if possible??
        var modRM = this.NextModRM();
        var srcVal = (opcode == 0xc6 ? this.NextByte() : this.NextUInt32());
        if (modRM.Reg != 0) throw("Invalid operation");
        if (modRM.Target.type == "register") {
          this.setRegister(modRM.Target.value, srcVal);
        } else {
          var addr = modRM.Target.value;
          var len = (opcode == 0xc6 ? 1 : 4);
          this.WriteToMemory(Utils.ToLEBytes(srcVal, len), addr);
        }
      }
      else if (opcode == 0xc9) { // LEAVE
        this._regs.esp = this._regs.ebp;
        this._regs.ebp = Utils.ToUInt32(this.PopFromStack());
      }
      else if (opcode == 0xe8) {
        // Near-call, relative
        var offset = this.NextInt32();
        this.PushToStack(Utils.ToLEBytes(this._regs.eip, 4));
        this._regs.eip += offset;
      }
      else if (opcode == 0xe9) { // JMP rel32
        var offset = this.NextInt32();
        this._regs.eip += offset;
      }
      else if (opcode == 0xeb) { // JMP rel8
        var offset = Utils.ToSignedByte(this.NextByte())
        this._regs.eip += offset;
      }
      else if (opcode == 0xf2) {
        prefix = opcode;
      }
      else if (opcode == 0xff) {
        if (this.prefix != null) {
          console.log("Not handling prefixes - needs implementing!");
        }
        var modRM = this.NextModRM();
        if (modRM.Reg == 0x02) {
          // Near-call, absolute
          //this.PushToStack(Utils.ToLEBytes(this._regs.eip, 4));
          // This is a mess
          var extFunLoc = modRM.Target.type == "register" ? 
            this.getRegister(modRM.Target.value) : 
            Utils.ToUInt32(this.ReadFromMemory(4,
              modRM.Target.value - this._file.PEOptionalHeader.ImageBase));
          // Go and get the values from the file, as we are addressing non-virtually
          this._reader.JumpTo(extFunLoc);
          this._reader.ReadBytes(2);
          var funName = this._reader.ReadNTString();
          this._reader.JumpBack();

          // Temporary code to skip over these calls...
          this.TempFunctionHandle(funName);
        } else if (modRM.Reg == 0x06) {
          var srcVal = modRM.Target.type == "register" ?
            this.getRegister(modRM.Target.value) : 
            Utils.ToUInt32(this.ReadFromMemory(4, modRM.Target.value));
          this.PushToStack(Utils.ToLEBytes(srcVal));
        }
      } else {
        debugger;
        exec = false;
      }
      this._prefix = prefix; prefix = null;
    }
  }

  TempFunctionHandle(funName) {
    var params, retVal;
    switch(funName) {
      case "OpenClipboard": params = []; break;
      case "GetClipboardData": params = ["uFormat"]; break;
      case "GlobalLock": params = ["hMem"]; break;
      case "GlobalUnlock": params = ["hMem"]; break;
      case "EmptyClipboard": params = []; break;
      case "SetClipboardData": params = ["uFormat", "hMem"]; break;
      case "CloseClipboard": params = []; break;
      case "ExitProcess": params = []; break;
      default: debugger;
    }
    if (params) {
      var paramVals = [];
      var paramText = [];
      for (let param of params) {
        var paramVal = Utils.ToUInt32(this.PopFromStack());
        paramVals.push(paramVal);
        paramText.push(`${param} = ${paramVal}`);
      }
      console.log(`Calling external: ${funName}(${paramText.join(", ")})`);
      var fn = ExternalFunctions[funName];
      if (!fn) throw("External function not defined!");
      if (params.length != fn.prototype.constructor.length)
        throw("Number of function arguments don't match!")
      this._regs.eax = ExternalFunctions[funName](...paramVals);
    }

  }

  Move() {
    var instr = this.NextByte();

  }

  TEMP_VIEW_STRING() {
    console.log(this.PeekMemory(40, 0x800000).map(x => String.fromCharCode(parseInt(x, 16))));
  }

  PeekMemory(nbytes, location) {
    return this._memory.slice(location, location + nbytes)
      .map(x => x.toString(16).padStart(2, "0"));
  }

  PeekStack(nbytes = this._regs.ebp - this._regs.esp, offset = 0) {
    return this.PeekMemory(nbytes, this._regs.esp + offset);
  }

  PeekInstructions(nbytes = 4, offset = 0) {
    return this.PeekMemory(nbytes, this._regs.eip + offset);
  }

  // TODO: Figure out where ESP should actually point
  PushToStack(bytes) {
    // TODO: enforce that bytes must be of length 4
    this._regs.esp -= bytes.length;
    var location = this._regs.esp;
    this.WriteToMemory(bytes, location);
  }

  // TODO: Generalise away from just 4 bytes.
  PopFromStack() {
    var val = this.ReadFromMemory(4, this._regs.esp);
    this._regs.esp += val.length;
    return val;
  }

  PushRegister(regIndex) {
    var val = this.getRegister(regIndex);
    this.PushToStack(Utils.ToLEBytes(val));
  }

  PopRegister(regIndex) {
    var val = Utils.ToUInt32(this.PopFromStack());
    this.setRegister(regIndex, val);
  }
  
  ReadFromMemory(nbytes, location) {
    return this._memory.slice(location, location + nbytes);
  }

  ReadByte(location) {
    return this._memory[location];
  }
  ReadNTString(location) {
    var s = "";
    while (location < this._memory.length) {
      let b = this._memory[location++];
      if (b == 0) return s;
      s += String.fromCharCode(b);
    }
  }

  WriteToMemory(bytes, location) {
    for (let i = 0; i < bytes.length; i++)
      this._memory[location++] = bytes[i];
  }

}