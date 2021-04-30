function handleDragOver(e) {
  e.preventDefault();
}

function handleDrop(e) {
  let dt = e.dataTransfer;
  let file = dt.files[0];

  readFile(file);
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
  var link = document.createElement("a");
  //var js = "globals.viewer.JumpTo(" + address + ", length);";
  link.onclick = () => globals.viewer.JumpTo(address, length);
  link.setAttribute("href", "#B" + address);
  link.innerHTML = innerHTML;
  return link;
}

function showres(reflink) {
  var path = reflink.attributes.attr.value;
  path = path.split(",");
  var item = globals.exeFile.Resources;
  for (let step of path) {
    item = item.Entries[step].Child;
  }
  console.log(item.Extract());
}

function CreateResourceTree(resourceDirectory, path = "") {
  var htmlOut = "";
  if (resourceDirectory instanceof ResourceDirectoryTable) {
    htmlOut = "<ul>";
    let i = 0;
    for (let entry of resourceDirectory.Entries) {
      newPath = path + (path == "" ? "" : ",") + (i++);
      htmlOut += "<li>\n" + 
        CreateResourceTree(entry.Child, newPath) +
      "</li>\n";
    }
    htmlOut += "</ul>";
  } else if (resourceDirectory instanceof ResourceDataEntry) {
    debugger;
    htmlOut += "<li><a attr='" + path + "' href='#' onclick='showres(this)'>FILE</a></li>";
  } else {
    throw("Unknown type");
  }
  return htmlOut;
}

function showSection(name) {
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
      dest.innerHTML = "";
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
      dest.innerHTML = "";
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
      dest.innerHTML = "";
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
      htmlOut = CreateResourceTree(globals.exeFile.Resources);
      dest.innerHTML = htmlOut;
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
        dest.innerHTML = "";
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
    var section = document.createElement("div");
    section.classList.add("section-summary");
    section.innerText = sectionName;
    section.onclick = () => showSection(sectionName);
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
  });

  document.body.ondragover = handleDragOver;
  document.body.ondrop = handleDrop;
  globals.exeFile = OpenExe(exeData);

  globals.viewer = new Viewer(globals.exeFile._reader, getViewer());
  globals.viewer.Print();

  SummariseFile();
}