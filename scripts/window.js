function CssLoaded(path) {
  for (let link of document.getElementsByTagName("link")) {
    if (link.href == path) return true;
  }
  return false;
}

function LoadCssFile(path) {
  if (CssLoaded(path)) return; 
  var link = document.createElement("link");
  link.href = path;
  link.type = "text/css";
  link.rel = "stylesheet";

  document.getElementsByTagName("head")[0].appendChild(link);
}

function SetWindowFocus() {
  var z = this.ZIndex;
  for (let id of Object.keys(windows)) {
    let window = windows[id];
    if (window.ZIndex > z) {
      window.ZIndex -= 100;
      this.ZIndex += 100;
    }
  }
}

function DoFind() {
  var findText = document.getElementById("find-text-input");
  var searchFrom = document.getElementById("find-search-from");
  var ignoreCaseCheckbox = document.getElementById("find-ignore-case");
  var wrapSearch = document.getElementById("find-wrap");
  var findResponse = document.getElementById("find-response");
  var updateSearchfrom = document.getElementById("find-update-searchfrom");
  var searchHex = document.getElementById("find-search-hex");
  var findValue = findText.value;
  var searchFromInt = Utils.HexToDec(searchFrom.value);
  if (!isFinite(searchFromInt)) searchFromInt = 0;
  if (searchHex.checked) {
    if (Utils.ValidHex(findValue)) {
      findValue = findValue.trim().split(" ").map(Utils.HexToDec);
    } else {
      findResponse.innerHTML = "<p style='color: #f40;'>Invalid hex</p>";
      return;
    }
  } else {
    // Throw out non-printable characters (as per ASCII) 
    findValue = findValue.replace(/(?![ -~]).$/, "");
    findText.value = findValue;
  }
  var pos = globals.exeFile.Find(findValue, ignoreCaseCheckbox.checked, searchFromInt, wrapSearch.checked);
  if (pos != -1) {
    globals.viewer.JumpTo(pos, findValue.length, searchFromInt);
    searchFromInt = pos + 1;
  }
  if (updateSearchfrom.checked) {
    searchFrom.value = "0x" + Utils.DecToHex(searchFromInt, 8);
  }

  if (pos == -1) {
    findResponse.innerHTML = "<p style='color: #f40;'>No results found</p>";
  } else {
    findResponse.innerHTML = "<p style='color: #190;'>Found at 0x" + Utils.DecToHex(pos, 8) + "</p>";
  }
}

function CreateFindContent() {
  var findText = document.getElementById("find-text-input");
  var searchFrom = document.getElementById("find-search-from");
  var searchForHex = document.getElementById("find-search-hex");
  var ignoreCaseCheckbox = document.getElementById("find-ignore-case");
  findText.onkeydown = (e) => {
    if (e.key == "Enter") {
      DoFind()
    } else if (!e.ctrlKey && !e.altKey) {
      if (!searchForHex.checked) return;
      var validKey = new RegExp(/[a-fA-F0-9 ]/).test(e.key);
      if (!validKey) e.preventDefault();
    }
  };
  findText.oninput = (e) => {
    if (!searchForHex.checked) return;
    if (e.inputType.startsWith("deleteContent")) return;
    Utils.RestrictToHex(findText);
  };
  searchFrom.onkeydown = (e) => { if (e.key == "Enter") DoFind() };
  searchForHex.onchange = (e) => {
    var textIsHex = Utils.ValidHex(findText.value);
    if (searchForHex.checked) {
      if (!textIsHex) {
        var hexBytes = Utils.StringToBytes(findText.value).map(x => Utils.DecToHex(x, 2));
        findText.value = hexBytes.join(" ");
      }
      Utils.RestrictToHex(findText);
      ignoreCaseCheckbox.attributes.invisChecked = ignoreCaseCheckbox.checked;
      ignoreCaseCheckbox.checked = false;
      ignoreCaseCheckbox.disabled = true;
    } else {
      if (textIsHex) {
        findText.value = Utils.BytesToString(findText.value.split(" ").map(Utils.HexToDec));
      }
      ignoreCaseCheckbox.checked = ignoreCaseCheckbox.attributes.invisChecked;
      ignoreCaseCheckbox.disabled = false;
    }
  };
  return document.getElementById("find-content");
}

// TODO: Move this to the main script
var windows = {};
window.addEventListener("load", function() {
  windows.resourceViewer = new Window();
  windows.resourceViewer.Hide();
  windows.resourceViewer.Title = "Resource Viewer";
  windows.resourceViewer.ZIndex = 100;
  windows.resourceViewer.FocusCallback = SetWindowFocus;

  windows.finder = new Window("Find", 300, 190, false);
  windows.finder.Sizeable = false;
  windows.finder.ZIndex = 200;
  windows.finder.FocusCallback = SetWindowFocus;
  document.body.addEventListener("keydown", function(e) {
    if (e.ctrlKey) {
      if (e.key == "f") {
        windows.finder.Show();
        windows.finder.Focus();
        var findTextBox = document.getElementById("find-text-input");
        findTextBox.focus();
        findTextBox.select();
        e.preventDefault();
      } else if (e.key == "o") {
        ShowFilePicker();
        e.preventDefault();
      }
    }
  });
  windows.finder.DomBodyContent.appendChild(CreateFindContent());
});

class Window {

  DomWindow;
  DomHeader;
  DomBody;
  DomTitleButtons = {};
  DomTitleText;
  FocusCallback;
  
  #domSizerLeft;
  #domSizerRight;
  #domSizerBottom;
  #domSizerBottomRight;
  #sizeable = true;

  get Visible() { return this.#visible };
  set Visible(value) {
    value ? this.Show() : this.Hide();
  }
  get Width() { return this.#width; }
  set Width(value) {
    this.#width = value;
    this.DomWindow.style.width = value;
  }
  get Height() { return this.#height; }
  set Height(value) {
    this.#height = value;
    this.DomWindow.style.height = value;
  }
  get Title() { return this.#title; }
  set Title(value) {
    this.#title = value;
    this.DomTitleText.innerText = value;
  }
  get Sizeable() { return this.#sizeable; }
  set Sizeable(value) {
    this.#sizeable = value;
    var sizers = this.DomWindow.getElementsByClassName("window-sizer");
    for (let sizer of sizers) {
      sizer.style.display = value ? "flex" : "none";
    }
    this.DomBody.style.padding = (value) ? "5px 0 0 0" : "5px";
  }
  get ZIndex() { return this.#zIndex; }
  set ZIndex(value) {
    this.#zIndex = value;
    this.DomWindow.style.zIndex = value; 
  }

  #dragMouseStart;
  #dragWindowStart;
  #dragging;
  #sizing;
  #sizingMethod;
  #title;
  #width;
  #height;
  #visible;
  #zIndex;
  
  constructor(title = "", width = 300, height = 150, visible = true) {
    this.#createWindow();
    this.Visible = visible;
    this.Title = title;
    this.Width = width;
    this.Height = height;
    // Centre the window
    this.DomWindow.style.left = "calc(50% - " + width / 2 + "px)";
    this.DomWindow.style.top  = "calc(50% - " + height / 2 + "px)";
    this.DomWindow.style.minWidth = "150px";
    this.DomWindow.style.minHeight = "80px";
  }

  #createDivWithin(parent, classes = []) {
    if (!(classes instanceof Array)) classes = [classes];
    var elem = document.createElement("div");
    elem.classList.add(...classes);
    parent.appendChild(elem);
    return elem;
  }

  #createWindow() {
    var _this = this;
    this.DomWindow = this.#createDivWithin(document.body, "window");
    if (this.Visible) this.Show();
    this.#createHeader();
    this.#createBody();
    this.DomWindow.addEventListener("mousedown", () => _this.Focus());
  }

  #createHeader() {
    this.DomHeader = this.#createDivWithin(this.DomWindow, "window-title-bar");

    this.DomTitleButtons.Close = this.#createDivWithin(
      this.DomHeader, ["window-title-button", "window-close"]);
    this.DomTitleButtons.Close.onclick = () => { this.Hide(); };

    this.DomTitleText = this.#createDivWithin(this.DomHeader, "window-title-text");
    
    this.#attachMoveListeners();
  }

  #createBody() {
    this.DomBody = this.#createDivWithin(this.DomWindow, "window-body");
    var mainRow = this.#createDivWithin(this.DomBody, "window-body-mainrow");
    this.#domSizerLeft = this.#createDivWithin(mainRow, ["window-sizer", "sizer-left"]);
    this.DomBodyContent = this.#createDivWithin(mainRow, "window-body-content");
    this.#domSizerRight = this.#createDivWithin(mainRow, ["window-sizer", "sizer-right"]);
    this.#domSizerBottom = this.#createDivWithin(this.DomBody, ["window-sizer", "sizer-bottom"]);
    this.#domSizerBottomRight = this.#createDivWithin(this.#domSizerBottom, ["window-sizer", "sizer-bottom-right"]);
    
    this.#attachSizerListeners();
  }

  #attachMoveListeners() {
    var _this = this;
    document.body.addEventListener("mousedown", function(e) {
      if (e.target == _this.DomHeader || e.target == _this.DomTitleText) {
        _this.#dragMouseStart = {x: e.x, y: e.y};
        _this.#dragWindowStart = {
          x: _this.DomWindow.offsetLeft,
          y: _this.DomWindow.offsetTop
        };
        _this.#dragging = true;
        e.preventDefault();
        e.stopPropagation();
      }
    });
    document.body.addEventListener("mouseup", function(e) {
      _this.#dragMouseStart = null;
      _this.#dragging = false;
    });
    document.body.addEventListener("mousemove", function(e) {
      if (_this.#dragging) {
        var diff = {
          x: e.x - _this.#dragMouseStart.x,
          y: e.y - _this.#dragMouseStart.y
        }
        _this.DomWindow.style.left = _this.#dragWindowStart.x + diff.x + "px";
        _this.DomWindow.style.top = _this.#dragWindowStart.y + diff.y + "px";
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

  #targetType(target) {
    // LEFT, TOP, WIDTH, HEIGHT = 8, 4, 2, 1 respectively
    if (target == this.#domSizerLeft) return 10;
    if (target == this.#domSizerRight) return 2;
    if (target == this.#domSizerBottom) return 1;
    if (target == this.#domSizerBottomRight) return 3;
    return 0;
  }

  #attachSizerListeners() {
    var _this = this;
    document.body.addEventListener("mousedown", function(e) {
      var targetType = _this.#targetType(e.target);
      if (targetType) {
        _this.#dragMouseStart = {x: e.x, y: e.y};
        _this.#dragWindowStart = {
          x: _this.DomWindow.offsetLeft,
          y: _this.DomWindow.offsetTop,
          width: _this.DomWindow.offsetWidth,
          height: _this.DomWindow.offsetHeight
        };
        _this.#sizing = true;
        _this.#sizingMethod = targetType;
        e.preventDefault();
        e.stopPropagation();
      }
    });
    document.body.addEventListener("mousemove", function(e) {
      if (_this.#sizing) {
        var diff = {
          x: e.x - _this.#dragMouseStart.x,
          y: e.y - _this.#dragMouseStart.y
        }
        if ((_this.#sizingMethod & 8) == 8) {
          diff.x *= -1;
          _this.DomWindow.style.left = _this.#dragWindowStart.x - diff.x + "px";
        }
        if ((_this.#sizingMethod & 4) == 4) {
          diff.y *= -1;
          _this.DomWindow.style.top = _this.#dragWindowStart.y - diff.y + "px";
        }
        if ((_this.#sizingMethod & 2) == 2) {
          _this.DomWindow.style.width = _this.#dragWindowStart.width + diff.x + "px";
        }
        if ((_this.#sizingMethod & 1) == 1) {
          _this.DomWindow.style.height = _this.#dragWindowStart.height + diff.y + "px";
        }

        
        e.preventDefault();
        e.stopPropagation();
      }
    });
    document.body.addEventListener("mouseup", function(e) {
      _this.#sizing = false;
    });
  }

  Show() {
    this.#visible = true;
    this.DomWindow.classList.add("visible");
  }
  Hide() {
    this.#visible = false;
    this.DomWindow.classList.remove("visible");
  }
  Toggle() {
    this.Visible = !this.Visible;
  }
  Focus() {
    if (this.FocusCallback) this.FocusCallback.bind(this)();
  }

}