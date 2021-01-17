class Viewer {

  static ROW_SIZE = 14.667;
  static COL_SIZE = 21.2;
  static SCROLL_TICK_PX = 40;

  constructor(data, container) {
    if (!data instanceof Reader) {
      throw("A viewer object must be initialised with a DataSet object");
    }
    this.data = data;
    this.container = container;
    this.lineOffset = 0;
    this.highlightedCells = [];
    this.initialise();
    this.resizeScroller();
    this.selectionLocked = false;
  }

  SetData = function(data) {
    this.data = data;
    this.setNumVisibleLines();
    this.resizeScroller();
  }

  initialise = function() {

    var viewer = this.container;
    this.container.innerHTML = "";

    this.setNumVisibleLines();

    var lineNums = document.createElement("code");
    var hexChunk = document.createElement("code");
    var txtChunk = document.createElement("code");
    lineNums.setAttribute("id", "lineNums");
    hexChunk.setAttribute("id", "hexChunk");
    txtChunk.setAttribute("id", "txtChunk");

    this.subViews = {
      lineNums: [],
      hexLines: [],
      txtLines: []
    }

    var blankLineHex = (new Array(16)).fill("&nbsp;&nbsp;");
    var blankLineTxt = (new Array(16)).fill("&nbsp;");

    var createRow = function(data) {
      var i = 0;
      return data.map(x => {
        var el = document.createElement("div");
        el.innerHTML = x;
        el.setAttribute("data-col", i++);
        return el;
      });
    }

    for (let i = 0; i < this.numVisibleLines; i++) {
      let lineNum = document.createElement("div");
      let hexLine = document.createElement("div");
      let txtLine = document.createElement("div");

      for (let el of createRow(blankLineHex)) hexLine.appendChild(el);
      for (let el of createRow(blankLineTxt)) txtLine.appendChild(el);

      hexLine.classList.add("hex-row");
      txtLine.classList.add("text-row");
      hexLine.setAttribute("data-row", i);
      txtLine.setAttribute("data-row", i);
      lineNum.classList.add(i % 2 == 0 ? "even" : "odd");
      hexLine.classList.add(i % 2 == 0 ? "even" : "odd");
      txtLine.classList.add(i % 2 == 0 ? "even" : "odd");

      lineNums.appendChild(lineNum);
      hexChunk.appendChild(hexLine);
      txtChunk.appendChild(txtLine);

      this.subViews.lineNums.push(lineNum);
      this.subViews.hexLines.push(hexLine);
      this.subViews.txtLines.push(txtLine);

      // TODO: Move
      this.hexCells = [];
      for (let l of this.subViews.hexLines) {
        let r = l.getElementsByTagName("div");
        for (let c of r) {
          this.hexCells.push(c);
        }
      }

    }
    
    this.container.appendChild(lineNums);
    this.container.appendChild(hexChunk);
    this.container.appendChild(txtChunk);

    this.createScroller();

    this.attachMouseEvents();
    this.attachKeyEvents();
    this.attachScrollEvents();

  }

  createScroller = function() {
    var dummyDiv = document.createElement("div");
    this.scroller = document.createElement("code");
    this.scroller.setAttribute("id", "scroller");
    this.scroller.appendChild(dummyDiv);
    this.container.appendChild(this.scroller);
  }

  setNumVisibleLines = function() {
    this.numVisibleLines = Math.floor(this.container.clientHeight / Viewer.ROW_SIZE);
  }

  resizeScroller = function() {
    var numTotalLines = Math.ceil(this.data.Length / 16);
    var numInvisibleLines = numTotalLines - this.numVisibleLines;
    var invisibleHeight = numInvisibleLines * Viewer.SCROLL_TICK_PX;
    var visibleHeight = this.scroller.clientHeight;
    var dummy = this.scroller.getElementsByTagName("div")[0];
    dummy.style.height = (invisibleHeight + visibleHeight) + "px";
  }

  Print = function() {
    var lineStartByte = this.lineOffset * 16;
    this.data.JumpTo(lineStartByte, false, false);
    for (let line = 0; line < this.numVisibleLines; line++) {
      this.subViews.lineNums[line].innerHTML = Utils.DecToHex(lineStartByte, 8);
      let hexLine = this.subViews.hexLines[line];
      let txtLine = this.subViews.txtLines[line];
      let nBytes = Math.min(16, this.data.Length - this.data.Position);
      let bytes = this.data.ReadBytes(nBytes);
      for (let c = 0; c < nBytes; c++) {
        let cellVal = bytes[c];
        hexLine.getElementsByTagName("div")[c].innerHTML = Utils.DecToHex(cellVal);
        txtLine.getElementsByTagName("div")[c].innerHTML = Utils.ConvertToChar(cellVal);
      }
      for (let c = nBytes; c < 16; c++) {
        hexLine.getElementsByTagName("div")[c].innerHTML = "&nbsp;&nbsp;";
        txtLine.getElementsByTagName("div")[c].innerHTML = "&nbsp;";
      }
      lineStartByte += 16;
    }
  }

  createSectionChars = function(parent) {
    var secStart = document.createElement("div");
    var secEnd = document.createElement("div");
    secStart.setAttribute("class", "section-start");
    secEnd.setAttribute("class", "section-end");
    var startChar = document.createElement("p");
    var endChar = document.createElement("p");
    startChar.textContent = "[";
    endChar.textContent = "]";
    secStart.appendChild(startChar);
    secEnd.appendChild(endChar);
    parent.prepend(secStart);
    parent.prepend(secEnd);

    return [startChar, endChar];
  }

  highlightSection = function(startByte, endByte, focByte, depth) {

    var firstVisibleByte = this.lineOffset * 16;
    var lastVisibleByte = (this.lineOffset + this.numVisibleLines) * 16 - 1;
    var startByteLim = Math.max(startByte, firstVisibleByte);
    var endByteLim = Math.min(endByte, lastVisibleByte);
    for (let i = startByteLim; i <= endByteLim; i++) {
      let [r, c] = this.getCoords(i);
      r -= this.lineOffset;
      let el = this.subViews.hexLines[r].getElementsByTagName("div")[c];
      if (i != focByte) {
        let lum = Utils.DecToHex(Math.floor(255 * (10-depth)/10), 2);
        let lum1 = Utils.DecToHex(Math.floor(220 * (10-depth)/10), 2);
        el.style.backgroundColor = "#" + lum + lum1 + lum1;
        el.style.color = (depth > 5) ? "#FFF" : "#000";
        el.classList.add("section");
      } else {
        // TODO: This shouldn't be required if section selection is tidier
        el.style.color = "#000";
      }
    }
    
    var [startRow, startCol] = this.getCoords(startByte);
    var [endRow, endCol] = this.getCoords(endByte);
    startRow -= this.lineOffset;
    endRow -= this.lineOffset;

    var startChar, endChar;

    [startChar, endChar] = this.createSectionChars(hexChunk);
    startChar.style.top = (startRow * Viewer.ROW_SIZE - 3.5) + "px";
    startChar.style.left = (startCol * Viewer.COL_SIZE - 3) + "px";
    endChar.style.top = (endRow * Viewer.ROW_SIZE - 3.5) + "px";
    endChar.style.left = ((endCol + 1) * Viewer.COL_SIZE - 6.3) + "px";
    
    [startChar, endChar] = this.createSectionChars(txtChunk);
    var cs = 14.6;
    startChar.style.top = (startRow * Viewer.ROW_SIZE - 3.5) + "px";
    startChar.style.left = (startCol * cs - 3) + "px";
    endChar.style.top = (endRow * Viewer.ROW_SIZE - 3.5) + "px";
    endChar.style.left = ((endCol + 1) * cs - 5.5) + "px";

  }

  attachMouseEvents = function() {
    this.container.onmousedown = function(e) {
      if (e.button === 0) this.selectionLocked = !this.selectionLocked;
      var row = this.lastSelectedEl?.[0];
      var col = this.lastSelectedEl?.[1];
      if (row == null || col == null) return;
      let byte = Number(row) * 16 + Number(col);
      // TODO: Enable
      //highlightSections(byte, this.selectionLocked);
    }.bind(this);
    this.container.onmousemove = function(e) {
      if (this.selectionLocked && e) return;
      var row, col;
      if (e == null) {
        row = this.lastSelectedEl?.[0];
        col = this.lastSelectedEl?.[1];
      } else {
        var els = document.elementsFromPoint(e.clientX, e.clientY);
        for (var el of els) {
          if (el.hasAttribute("data-col")) {
            row = Number(el.parentElement.attributes["data-row"].value) + this.lineOffset;
            col = Number(el.attributes["data-col"].value);
            if (row === this.lastSelectedEl?.[0] && 
                col === this.lastSelectedEl?.[1]) return;
            this.lastSelectedEl = [row, col];
            break;
          }
        }
      }
      if (row != null && col != null) {
        let byte = Number(row) * 16 + Number(col);
        // TODO: Enable
        // this.unhighlightAllSections();
        // this.highlightSections(byte);
        this.unhighlightAllCells();
        this.highlightCell(this.getHexCell(row, col));
        this.highlightCell(this.getTxtCell(row, col));
      }
    }.bind(this);

    this.container.onmouseleave = function(e) {
      //this.unhighlightAllCells();
    }.bind(this);
  
    this.container.onmousewheel = function(e) {
      var scaleFactor = (e.deltaY % 150 == 0) ? 12 : 12; // Option to change factor for mouse vs trackpad
      this.scroller.scrollTo(null, this.scroller.scrollTop + e.deltaY * Viewer.SCROLL_TICK_PX / scaleFactor);
    }.bind(this);
  }

  attachKeyEvents = function() {
    document.body.onkeydown = function(e) {
      if (e.keyCode == 35) {
        this.JumpTo(this.data.length-1);
      } else if (e.keyCode == 36) {
        this.JumpTo(0);
      } else if (e.keyCode == 71 && e.ctrlKey) {
        Utils.ShowJumpToWindow(x => { this.JumpTo(x) });
        e.preventDefault();
      }
    }.bind(this);

    // this.container.onmouseleave = function(e) {
    //   //this.unhighlightAllCells();
    // }.bind(this);
  
    // this.container.onmousewheel = function(e) {
    //   var scaleFactor = (e.deltaY % 150 == 0) ? 12 : 12; // Option to change factor for mouse vs trackpad
    //   this.scroller.scrollTo(null, this.scroller.scrollTop + e.deltaY * Viewer.SCROLL_TICK_PX / scaleFactor);
    //   setTimeout(() => this.container.onmousemove(e), 0);
    // }.bind(this);
  }
  
  attachScrollEvents = function() {
    this.scroller.onscroll = function() {
      //var scrollMax = this.scroller.scrollHeight - this.scroller.clientHeight;
      //var scrollPerc = scrollMax == 0 ? 0 : this.scroller.scrollTop / scrollMax;
      // TODO: Fix this... +2 is a hack
      //var totalNumLines = Math.ceil(this.data.Length / 16) + 2;
      //this.lineOffset = Math.floor((totalNumLines - this.numVisibleLines) * scrollPerc);
      this.lineOffset = Math.floor(this.scroller.scrollTop / Viewer.SCROLL_TICK_PX);
      if (this.lineOffset % 2 == 0) {
        this.container.classList.remove("offset");
      } else {
        this.container.classList.add("offset");
      }
      this.Print();
      setTimeout(() => this.container.onmousemove(), 0);
    }.bind(this);
  }

  JumpTo = function(byte) {
    if (byte < 0) byte = 0;
    if (byte >= this.data.Length) byte = this.data.Length - 1;
    var [row, col] = this.getCoords(byte);
    var targetLine = row - Math.floor(this.numVisibleLines / 2);
    var perc = targetLine / Math.ceil(this.data.Length / 16 - this.numVisibleLines);
    perc = Math.min(Math.max(perc, 0), 1);
    var scrollMax = this.scroller.scrollHeight - this.scroller.clientHeight;
    this.scroller.scrollTo(null, perc * scrollMax);
    this.scroller.onscroll();

    setTimeout(() => {
      this.Print();
      var cell = this.getHexCell(row, col);

      cell.style.transition = "1s";
      cell.classList.add("temphighlighted");
      setTimeout(() => cell.classList.remove("temphighlighted"), 0);
      
      // var tempHighlight = function(element, iters, maxIter) {
      //   if (maxIter == null) maxIter = iters;
      //   element.style.backgroundColor = "#008cc8" + Utils.DecToHex(Math.floor(255 * iters / maxIter));
      //   // TODO: Not global
      //   if (iters > 0) globals.jumpTimeout = setTimeout(tempHighlight, 20, element, iters-1, maxIter);
      // }
      // // TODO: Also reset style of any temp highlights!
      // if (globals.jumpTimeout) clearTimeout(globals.jumpTimeout);
      // tempHighlight(cell, 25);

    }, 0);
  }

  getHexCell = function(row, col) {
    var rowEl = this.subViews.hexLines[row - this.lineOffset];
    return rowEl?.getElementsByTagName("div")[col];
  }

  getTxtCell = function(row, col) {
    var rowEl = this.subViews.txtLines[row - this.lineOffset];
    return rowEl?.getElementsByTagName("div")[col];
  }

  unhighlightAllCells = function() {
    var cell;
    while (cell = this.highlightedCells?.pop()) {
      cell.classList.remove("highlighted");
    }
  }

  highlightCell = function(cell) {
    if (!cell) return;
    cell.classList.add("highlighted");
    this.highlightedCells.push(cell);
  }

  getCoords = function(bytePos) {
    var col = bytePos % 16;
    var row = (bytePos - col) / 16;
    return [row, col];
  }

}