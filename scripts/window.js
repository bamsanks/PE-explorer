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

var windows = {};
window.addEventListener("load", function() {
  windows.resourceViewer = new Window();
  windows.resourceViewer.Hide();
  windows.resourceViewer.Title = "Resource Viewer";
});

class Window {

  DomWindow;
  DomHeader;
  DomBody;
  DomTitleButtons = {};
  DomTitleText;
  
  #domSizerLeft;
  #domSizerRight;
  #domSizerBottom;
  #domSizerBottomRight

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

  #dragMouseStart;
  #dragWindowStart;
  #dragging;
  #sizing;
  #sizingMethod;
  #title;
  #width;
  #height;
  #visible;
  
  constructor(title = "", width = 300, height = 150, visible = true) {
    this.#createWindow();
    this.Visible = visible;
    this.Title = title;
    this.Width = width;
    this.Height = height;
    // Centre the window
    this.DomWindow.style.left = "calc(50% - " + width / 2 + "px)";
    this.DomWindow.style.top  = "calc(50% - " + height / 2 + "px)";
  }

  #createDivWithin(parent, classes = []) {
    if (!(classes instanceof Array)) classes = [classes];
    var elem = document.createElement("div");
    elem.classList.add(...classes);
    parent.appendChild(elem);
    return elem;
  }

  #createWindow() {
    this.DomWindow = document.createElement("div");
    this.DomWindow.classList.add("window");
    if (this.Visible) this.DomWindow.classList.add("visible");
    this.#createHeader();
    this.#createBody();
    document.body.appendChild(this.DomWindow);
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

}