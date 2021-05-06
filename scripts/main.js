function ShowFilePicker() {
  document.getElementById("file-selector").click();
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDrop(e) {
  let dt = e.dataTransfer;
  let file = dt.files[0];

  globals.viewer.JumpTo(0);
  readFile(file);
  clearSectionContent();
  e.preventDefault();
}

function OpenExe(data) {
  const file = new ExeFile(data);

  const machine = new Machine(file._reader);
  // machine.LoadExe(file);
  // machine.Execute();

  return file;
}

function CreateTable(tableData) {
  var ncol = tableData[0]?.length;
  var table = document.createElement("table");
  for (let row of tableData) {
    if (row.length != ncol) throw("Cannot create table with inconsistent column lengths!");
    let tr = document.createElement("tr");
    for (let col of row) {
      let td = document.createElement("td");
      if (col instanceof HTMLElement) {
        td.appendChild(col);
      } else {
        td.innerHTML = col;
      }
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  return table;
}

function CreateJumpLink(innerHTML, address, length = 1) {
  if (!address) return innerHTML;
  var link = document.createElement("a");
  link.onclick = () => globals.viewer.JumpTo(address, length);
  link.setAttribute("href", "#B" + address);
  link.innerHTML = innerHTML;
  return link;
}

function viewres(reflink) {
  var path = reflink.attributes.attr.value;
  path = path.split(",");
  var item = globals.exeFile.Resources;
  for (let step of path) {
    item = item.Entries[step].Child;
  }

  var resourceContent;
  if (item.ResourceType == "String") {
    resourceContent = document.createElement("textarea");
    resourceContent.readOnly = true;
    resourceContent.value = item.ResourceHandler();
  } else if (item.ResourceType == "PNG") {
    resourceContent = item.ResourceHandler();
  } else if (item.ResourceType == "Bitmap") {
    resourceContent = item.ResourceHandler();
  } else if (item.ResourceType == "Cursor") {
    resourceContent = item.ResourceHandler();
  } else {
    var resourceContent = document.createElement("textarea");
    resourceContent.readOnly = true;
    resourceContent.value = item.ResourceHandler();
  }

  // TODO: Move this to the Window class
  var oldNode = windows.resourceViewer.DomBodyContent;
  windows.resourceViewer.DomBodyContent = oldNode.cloneNode(false);
  oldNode.parentNode.replaceChild(windows.resourceViewer.DomBodyContent, oldNode);
  windows.resourceViewer.DomBodyContent.appendChild(resourceContent);
  windows.resourceViewer.Show();

}

function printres(reflink) {
  var path = reflink.attributes.attr.value;
  path = path.split(",");
  var item = globals.exeFile.Resources;
  for (let step of path) {
    item = item.Entries[step].Child;
  }
  console.log(item.Extract());
}

function jumpres(reflink) {
  var path = reflink.attributes.attr.value;
  path = path.split(",");
  var item = globals.exeFile.Resources;
  for (let step of path) {
    item = item.Entries[step].Child;
  }
  var addr = globals.exeFile._reader.MapAddress(item.DataRVA);
  //var max = globals.viewer.numVisibleLines * 16;
  globals.viewer.JumpTo(addr, 1); // Math.min(item.Size, max));
}

function saveres(reflink, extension = "") {
  var path = reflink.attributes.attr.value;
  path = path.split(",");
  var item = globals.exeFile.Resources;
  for (let step of path) {
    item = item.Entries[step].Child;
  }
  var data = item.Extract();
  var blob = new Blob([new Uint8Array(data)], {type: "octet/stream"}),
                      url = window.URL.createObjectURL(blob);
  var a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
  a.href = url;
  a.download = "Resource" + extension;
  a.click();
  window.URL.revokeObjectURL(url);
}

function GetExtension(refName) {
  if (refName.toLowerCase() == "png") {
    return ".png";
  }
}

// ext is really lazy, try putting this in resource parsing if possible
// TODO: Tidy up the HTML creation
function CreateResourceTree(resourceDirectory, path = "", level = 0, ext = "") {
  var htmlOut = "";
  if (resourceDirectory instanceof ResourceDirectoryTable) {
    htmlOut = "<div" + (level == 0 ? "" : " class=\"nested active\"") + ">";
    let i = 0;
    for (let entry of resourceDirectory.Entries) {
      htmlOut += "<div>\n";
      htmlOut += "<span class=\"toggler closed\">";
      if (level == 0) htmlOut += (entry.IsNamed ? entry.Name : resourceTypes[entry.ID]);
      if (level == 1) htmlOut += (entry.IsNamed ? entry.Name : ("#" + entry.ID));
      if (level == 2) htmlOut += "Language ID = " + entry.ID;
      htmlOut += "</span>"
      newPath = path + (path == "" ? "" : ",") + (i++);
      
      if (level == 0 && entry.IsNamed) ext = GetExtension(entry.Name);
      htmlOut += CreateResourceTree(entry.Child, newPath, level + 1, ext);
      htmlOut += "</div>\n";
    }
    htmlOut += "</div>";
  } else if (resourceDirectory instanceof ResourceDataEntry) {
    htmlOut += "<div class=\"nested active\">";
    htmlOut += "<a attr='" + path + "' href='#' onclick='printres(this)'>Print in console</a>";
    htmlOut += " | ";
    htmlOut += "<a attr='" + path + "' href='#' onclick='jumpres(this)'>Jump to</a>";
    htmlOut += " | ";
    htmlOut += "<a attr='" + path + "' href='#' onclick='saveres(this, \"" + ext + "\")'>Download</a>";
    htmlOut += " | ";
    htmlOut += "<a attr='" + path + "' href='#' onclick='viewres(this)'>View</a>";
    htmlOut += "</div>";
  } else {
    throw("Unknown type");
  }
  return htmlOut;
}

function selectSectionTab(tabItem) {
  var tabItems = document.getElementsByClassName("section-summary");
  for (let item of tabItems) item.classList.remove("selected");
  tabItem.classList.add("selected");
}

function AttachTreeViewEvents(container) {
  var toggler = container.getElementsByClassName("toggler");
  //debugger;

  for (let i = 0; i < toggler.length; i++) {
    toggler[i].addEventListener("click", function() {
      let el = this.parentElement.querySelector(".nested");
      if (el) el.classList.toggle("active");
      this.classList.toggle("closed");
    });
  }
}

function clearSectionContent() {
  var dest = document.getElementById("content");
  dest.innerHTML = "";
}

function showSection(tabItem, name) {
  selectSectionTab(tabItem);
  clearSectionContent();
  var dest = document.getElementById("content");
  var htmlOut;
  switch(name) {
    case "MZ Header":
      var keys = Object.keys(globals.exeFile.MZHeader);
      var tableData = [];
      for (let key of keys) {
        let field = globals.exeFile.MZHeader[key];
        let linkedKey = field ? CreateJumpLink(key, field.Address, field.Length) : key;
        tableData.push([linkedKey, field?.toString()]);
      }
      
      dest.appendChild(CreateTable(tableData));
      break;
    case "PE Header":
      var keys = Object.keys(globals.exeFile.PEHeader);
      var tableData = [];
      for (let key of keys) {
        let field = globals.exeFile.PEHeader[key];
        let linkedKey = field ? CreateJumpLink(key, field.Address, field.Length) : key;
        tableData.push([linkedKey, field.toString()]);
      }
      
      dest.appendChild(CreateTable(tableData));
      break;
    case "PE Optional Header":
      var keys = Object.keys(globals.exeFile.PEOptionalHeader);
      var tableData = [];
      for (let key of keys) {
        let field = globals.exeFile.PEOptionalHeader[key];
        let linkedKey = field ? CreateJumpLink(key, field.Address, field.Length) : key;
        tableData.push([linkedKey, field.toString()]);
      }
      
      dest.appendChild(CreateTable(tableData));
      break;
    case "Imports":
      htmlOut = "";
      if (globals.exeFile?.Imports == null) {
        htmlOut = "<i>No Imports</i>";
      } else {
        for (let importFile of globals.exeFile.Imports) {
          htmlOut += "<b>" + importFile.DllName + ":</b><br/>";
          for (let imp of importFile.Imports) {
            htmlOut += imp.ImportName + "<br>";
          }
          htmlOut += "<hr>";
        }
      }
      dest.innerHTML = htmlOut;
      break;
    case "Exports":
      htmlOut = "";
      if (globals.exeFile.Exports?.Exports == null) {
        htmlOut = "<i>No Exports</i>";
      } else {
        for (let exp of globals.exeFile.Exports.Exports ?? []) {
          htmlOut += exp.Name + "<br>";
        }
      }
      dest.innerHTML = htmlOut
      break;
    case "Resources":
      if (globals.exeFile.Resources == null) {
        htmlOut = "<i>No Resources</i>";
      } else {
        htmlOut = CreateResourceTree(globals.exeFile.Resources);
      }
      dest.innerHTML = htmlOut;
      AttachTreeViewEvents(dest);
      break;
    default:
      var section = globals.exeFile.SectionHeaders
        .filter(x => x.Name == name)[0];
        var keys = Object.keys(section);
        var tableData = [];
        for (let key of keys) {
          let field = section[key];
          let linkedKey = field ? CreateJumpLink(key, field.Address, field.Length) : key;
          tableData.push([linkedKey, field.toString()]);
        }
        
        dest.appendChild(CreateTable(tableData));
        break;
  }
}

function SummariseFile() {
  var cont = document.getElementById("section_summaries");
  var sectionNames = [
    "MZ Header", "PE Header", "PE Optional Header",
    "Imports", "Exports", "Resources"];

  for (let sectionHeader of globals.exeFile.SectionHeaders) {
    sectionNames.push(sectionHeader.Name);
  }

  cont.innerHTML = "";
  for (let sectionName of sectionNames) {
    let section = document.createElement("div");
    section.classList.add("section-summary");
    section.innerText = sectionName;
    section.onclick = () => showSection(section, sectionName);
    cont.appendChild(section);
  }
}

var globals = { exeFile: null };

function readFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', (event) => {
    const view = new Uint8Array(reader.result);
    globals.exeFile = OpenExe(view);
    SummariseFile();

    globals.viewer.SetData(globals.exeFile._reader);
    globals.viewer.Print();
  });
  reader.readAsArrayBuffer(file);
}

function getViewer() {
  return document.getElementById("hex-viewer");
}

window.onload = function() {

  const fileSelector = document.getElementById('file-selector');
  fileSelector.addEventListener('change', (event) => {
    const fileList = event.target.files;
    readFile(fileList[0]);
    clearSectionContent();
  });

  document.body.ondragover = handleDragOver;
  document.body.ondrop = handleDrop;
  globals.exeFile = OpenExe(exeData);

  globals.viewer = new Viewer(globals.exeFile._reader, getViewer());
  globals.viewer.Print();

  SummariseFile();
}