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

var x;
window.addEventListener("load", function() {
  LoadCssFile("styles/window.css");
  x = new Window();
  //x.Show();
});

class Window {

  DomWindow;
  DomHeader;
  DomBody;
  DomTitleButtons = {};

  Title;
  Visible;

  #dragMouseStart;
  #dragWindowStart;
  #dragging;
  
  constructor(title = "", visible = true) {
    this.SetTitle(title);
    this.Visible = visible;
    this.#createWindow();
  }

  #createWindow() {
    this.DomWindow = document.createElement("div");
    this.DomWindow.classList.add("window");
    if (this.Visible) this.DomWindow.classList.add("visible");
    this.#createHeader();
    document.body.appendChild(this.DomWindow);
  }

  #createHeader() {
    this.DomHeader = document.createElement("div");
    this.DomWindow.appendChild(this.DomHeader);
    this.DomHeader.classList.add("header");
    this.#attachMoveListeners(this.DomHeader);

    var closeButton = document.createElement("div");
    closeButton.classList.add(["window-title-button", "window-close"]);
    this.DomTitleButtons.Close = closeButton;
  }

  #attachMoveListeners(element) {
    var _this = this;
    document.body.addEventListener("mousedown", function(e) {
      if (e.target == element) {
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
        _this.DomWindow.style.left = _this.#dragWindowStart.x + diff.x;
        _this.DomWindow.style.top = _this.#dragWindowStart.y + diff.y;
        console.log(_this.#dragWindowStart.x + diff.x)
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

  SetTitle(title) {
    ///
  }

  Show() {
    this.DomWindow.classList.add("visible");
  }
  Hide() {
    this.DomWindow.classList.remove("visible");
  }
  Toggle() {
    this.DomWindow.classList.toggle("visible");
  }

}