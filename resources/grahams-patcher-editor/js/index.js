

///// utils /////

// get url args:
var querystring = (function() {
  var qstr = window.location.search;
  var query = {};
  var a = qstr.substr(1).split('&');
  for (var i = 0; i < a.length; i++) {
    var b = a[i].split('=');
    query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
  }
  return query;
})();

// debug messaging:
/*function post(msg) {
  console.log(msg);
  document.getElementById("post").innerHTML = msg + "<br>";
}
*/
///// websocket /////

var wsocket; 
var connected = false;
var connectTask;

function ws_connect() {
  if (connected) return;
    if ('WebSocket' in window) {
        //post('Connecting');
        var host = querystring.host || "localhost";
        var port = querystring.port || "8080";
        var address = "ws://" + host + ":" + port + "/";
        wsocket = new WebSocket(address);
        wsocket.onopen = function(ev) {        
            post('CONNECTED to ' + address);
            connected = true;
            // cancel the auto-reconnect task:
            if (connectTask != undefined) clearInterval(connectTask);
            // apparently this first reply is necessary
            var message = 'init';
            post('SENT: ' + message);
            wsocket.send(message);


                // send some JSON:
            //wsocket.send(JSON.stringify({ 
               // send new ojbect 
              // "script" :    ["newobject", "newobj", "@text", "metro 2000 @active 1", "@varname", "obj-8", "@patching_rect", 40., 30.]
               // send connect
               // "script" :    ["connect", "obj-8", 0, "obj-8", 0]
               // send delete
               // "script" :    ["delete", "obj-8"]
    

//}
//));
      
      // client messages sent with a "*" prefix will have the "*" stripped,
      // but the server will broadcast them all back to all other clients
      // broadcast a hello:
      // send("*hello "+Math.floor(Math.random()*100));
        };

        wsocket.onclose = function(ev) {
            post('DISCONNECTED from ' + address);
            connected = false;
            // set up an auto-reconnect task:
            //connectTask = setInterval(ws_connect, 1000);
        };

        wsocket.onmessage = function(ev) {
          // was it a dict?
          if (ev.data.charAt(0) == "{") {
            // attempt to json parse it:
            var tree = JSON.parse(ev.data);
            post("parsed " + JSON.stringify(tree));
          } else {
            post("received msg:" + ev.data.length + ": " + ev.data.substr(0, 50));
          }
        };

        wsocket.onerror = function(ev) {
            post("WebSocket error");
        };

    } else {
        post("WebSockets are not available in this browser!!!");
    }
}

function send(msg) {
  if(wsocket != undefined) wsocket.send(msg);
  post("sent msg:" + msg.length + ": " + msg);
          
}

///// sequencing /////

function handlemessage(msg) {
  
}

///// start up /////

ws_connect();



// a stripped-down version of a maxpat file:
var maxpat = {
  boxes: [{
    box: {
      id: "obj-1",
      maxclass: "newobj",
      numinlets: 0,
      numoutlets: 1,
      patching_rect: [50.0, 14.0, 20.0, 22.0],
      text: "in 1"
    }
  }, {
    box: {
      id: "obj-2",
      maxclass: "newobj",
      numinlets: 0,
      numoutlets: 1,
      patching_rect: [305.0, 14.0, 30.0, 22.0],
      text: "in 2 @comment \"this is a long comment\""
    }
  }, {
    box: {
      id: "obj-3",
      maxclass: "newobj",
      numinlets: 3,
      numoutlets: 1,
      patching_rect: [176.0, 149.0, 29.5, 22.0],
      text: "switch"
    }
  }, {
    box: {
      id: "obj-5",
      maxclass: "newobj",
      numinlets: 2,
      numoutlets: 2,
      patching_rect: [176.0, 300.0, 29.5, 22.0],
      text: "cartopol"
    }
  }, {
    box: {
      id: "obj-4",
      maxclass: "newobj",
      numinlets: 1,
      numoutlets: 0,
      patching_rect: [176.0, 418.0, 37.0, 22.0],
      text: "out 1"
    }
  }, {
    box: {
      id: "obj-6",
      maxclass: "newobj",
      numinlets: 1,
      numoutlets: 0,
      patching_rect: [276.0, 418.0, 37.0, 22.0],
      text: "out 2"
    }
  }],
  lines: [{
    patchline: {
      destination: ["obj-3", 0],
      source: ["obj-1", 0]
    }
  }, {
    patchline: {
      destination: ["obj-3", 1],
      source: ["obj-1", 0]
    }
  }, {
    patchline: {
      destination: ["obj-3", 2],
      source: ["obj-2", 0]
    }
  }, {
    patchline: {
      destination: ["obj-5", 1],
      source: ["obj-2", 0]
    }
  }, {
    patchline: {
      destination: ["obj-4", 0],
      source: ["obj-5", 0]
    }
  }, {
    patchline: {
      destination: ["obj-5", 0],
      source: ["obj-3", 0]
    }
  }, {
    patchline: {
      destination: ["obj-6", 0],
      source: ["obj-5", 1]
    }
  }, ],
};

// convenient references:
var canvas = document.getElementById('patcher_canvas');
var context = canvas.getContext('2d');
var patcher_div = $("#patcher");
var log = $("#log");

// the text editor box
// not sure why I have to generate this here instead of in the HTML...
var box_editor = $('<textarea />', {
  id: "box_editor",
  "class": "maxbox",
  text: ""
});

// patcher layout config:
var box_editor_extraspace = 20;
var port_width = 8;
var port_width_half = port_width * 0.5;

// the patcher data structure (similar to maxpat)
var patcher = {
  boxes: {},
  lines: []
};

// continuously updated:
var mousepos = {
  x: 20,
  y: 20
};
// is a maxbox currently selected?
var box_editor_started = {};
// are we currently editing a maxbox?
var box_editing = false;
// are we currently drawing a line?
var line_editing = false;
// the currently edited line:
var line_editor_started = {};

// utility to prevent reserved names from being used
var safename = function(name) {
  // TODO
  return name;
}

// generate a unique identifier name
var uid = (function() {
  var id = 0;
  return function(name) {
    if (name) {
      // TODO: trim trailing underscores, numbers & whitespace
      name = safename(name);
    }
    // check again: might have trimmed the entire name away
    if (!name) name = "anon";
    return name + "_" + id++;
  }
})();

// generate a new unique ID
var newid = (function() {
  var id = 1000;
  return function() {
    return id++;
  }
})();

// start editing a maxbox:
function box_editor_start(element) {
  box_editor_started.element = element;

  var offset = element.offset();
  box_editor
    .css({
      left: offset.left,
      top: offset.top,
      width: element.outerWidth() + box_editor_extraspace,
      height: element.outerHeight(),
    })
    .val(element.text())
    .show().focus();
  element.hide();
  box_editing = true;
}

// called on each keystroke etc. while editing a maxbox
// updates editor size
function box_editor_edit() {
  var element = box_editor_started.element;
  // copy text to div:
  box_updatetext(element, box_editor.val());
  // use this to resize the editor:
  $(this).css({
    width: element.outerWidth() + box_editor_extraspace,
    height: element.outerHeight(),
  });
}

// done editing, hide the editor and show the div again
function box_editor_done() {
  var element = box_editor_started.element;
  if (element != undefined) {
    box_updatetext(element, box_editor.val());
    element.show();
  }
  box_editor.hide();
  box_editing = false;

  // because boxes may have changed size, must redraw cables:
  update_canvas();
}

// select & start moving a maxbox:
function box_mousedown(e) {
  e.preventDefault(); // no ugly text selecting

  // because event could be fired from any child element
  // but we don't want the inlets & outlets to trigger box dragging
  var target = $(e.target)
  if (target.hasClass("inlet") || target.hasClass("outlet")) {
    // switch to processing inlets/outlets directly here?
    return;
  }

  e.stopPropagation();
  var element = $(this);
  var offset = element.offset();

  box_editor_done();

  box_editor_started = {
    element: element,
    x0: e.pageX - offset.left,
    y0: e.pageY - offset.top,
  };

  $(".patcher_container")
    .on('mouseup', box_mouseup)
    .on('mousemove', box_mousedrag);
}

// stop moving maxbox -- and start editing
function box_mouseup(e) {
  $(".patcher_container")
    .off('mouseup', box_mouseup)
    .off('mousemove', box_mousedrag);

  // now we have clicked on the box, we should place the editor box over it:
  box_editor_start(box_editor_started.element);
}

// moving selected maxbox around:
function box_mousedrag(e) {
  e.preventDefault();
  e.stopPropagation();
  var left = e.pageX - box_editor_started.x0;
  var top = e.pageY - box_editor_started.y0;
  $(box_editor_started.element).offset({
    top: top,
    left: left
  });

  update_canvas();
}

// get the jQuery-wrapped div corresponding to a box ID: 
function box_div(id) {
  return $("#" + id);
}

function box_updatetext(element, text) {
  element.find(".maxtext").text(text);

  // reposition inlets & outlets:
  var w = element.innerWidth() - port_width;
  var inlets = element.find(".inlet");
  var outlets = element.find(".outlet");
  var inlet_spacing = w / (Math.max(1, inlets.length - 1));
  var outlet_spacing = w / (Math.max(1, outlets.length - 1));

  inlets.each(function(i) {
    $(this).css({
      left: i * inlet_spacing
    });
  });

  outlets.each(function(i) {
    $(this).css({
      left: i * outlet_spacing
    });
  });
}

// click on an inlet/outlet
function inlet_mousedown(e) {
  e.preventDefault();
  e.stopPropagation();
  line_editing = true;
  line_editor_started.inlet = $(this);
}

function outlet_mousedown(e) {
  e.preventDefault();
  e.stopPropagation();
  line_editing = true;
  line_editor_started.outlet = $(this);
}

// mouse release on an inlet/outlet
function inlet_mouseup(e) {
  e.preventDefault();
  e.stopPropagation();
  if (line_editing && line_editor_started.outlet) {
    line_editor_started.inlet = $(this);
    line_editor_complete();
  }
}

function outlet_mouseup(e) {
  e.preventDefault();
  e.stopPropagation();
  if (line_editing && line_editor_started.inlet) {
    line_editor_started.outlet = $(this);
    line_editor_complete();
  }
}

// patch-line creation was cancelled:
function line_editor_discard() {
  line_editing = false;
  delete line_editor_started.inlet;
  delete line_editor_started.outlet;
  update_canvas();
}

// patch-line creation completed:
function line_editor_complete() {

  // add to patcher lines
  console.log(+line_editor_started.inlet.attr("data-inlet") - 1);
  console.log(+line_editor_started.outlet.attr("data-outlet") - 1);

  patcher.lines.push({
    source: {
      id: line_editor_started.outlet.parent().attr("id"),
      idx: +line_editor_started.outlet.attr("data-outlet") - 1
    },
    destination: {
      id: line_editor_started.inlet.parent().attr("id"),
      idx: +line_editor_started.inlet.attr("data-inlet") - 1
    },
  });

  line_editor_discard();
}

// create a new maxbox and focus it for editing
function box_new(text, id, numinlets, numoutlets) {
  if (typeof id == "undefined") id = "obj-" + newid();
  if (typeof text == "undefined") text = "";
  if (typeof numinlets == "undefined") numinlets = 2;
  if (typeof numoutlets == "undefined") numoutlets = 1;

  var tokens = text.split(" ");
  var opname = tokens.shift();

  // create the data:
  // TODO: consider storing this in the DOM using data- attributes
  // http://ejohn.org/blog/html-5-data-attributes/
  // ... to remove the redundancy of two representations of the patcher?
  var box = {
    id: id,
    numinlets: numinlets,
    numoutlets: numoutlets,

    opname: opname,
    tokens: tokens,

    inlets: [],
    outlets: [],
  };

  // add to patcher:
  patcher.boxes[box.id] = box;

  // create the box container element:
  // set the position
  // add the mouse handler
  // append to patcher div:
  var jdiv = $('<div/>', {
      id: id,
      "class": "maxbox"
    })
    .offset({
      left: mousepos.x,
      top: mousepos.y
    })
    .mousedown(box_mousedown)
    .appendTo(patcher_div);

  // create the box contents:
  // create inlet divs & attach mouse handlers
  // create inlet data
  for (var i = 0; i < box.numinlets; i++) {
    jdiv.append(
      $('<div/>', {
        "class": "inlet",
        "data-inlet": i + 1
      })
      .mousedown(inlet_mousedown)
      .mouseup(inlet_mouseup)
    );

    box.inlets[i] = {
      type: "inlet",
      sources: [],
      default: 0
    };
  }

  // create the maxbox text div
  jdiv.append($('<div/>', {
    "class": "maxtext"
  }));

  // create the outlet divs & attach handlers
  // add outlets to the data structure (with unique names)
  for (var i = 0; i < box.numoutlets; i++) {
    jdiv.append($('<div/>', {
        "class": "outlet",
        "data-outlet": i + 1
      })
      .mousedown(outlet_mousedown)
      .mouseup(outlet_mouseup)
    );

    box.outlets[i] = {
      type: "outlet",
      name: uid(opname)
    };
  }

  // set the text of the maxbox
  box_updatetext(jdiv, text);

  return box;
}

// put the patcher data structure into the log panel:
function show_patcher_json() {
  json = JSON.stringify(patcher, null, 4);
  log.text(json);
  //wsocket.send(JSON.stringify(json)
               // send new ojbect 
               //"script" :    json
//);
}

// capture patcher keystrokes (when not editing a maxbox)
// e.g. "n" for new box
function patcher_keydown(e) {
  if (box_editing) return;
  switch (e.which) {
    case 78:
      { // 'n'
        var box = box_new();
        box_editor_start(box_div(box.id));
        break;
      }
    case 83:
      { // 's'
        show_patcher_json();
        break;
      }
    default:
      console.log("key", e.which);
      return;
  }
  e.preventDefault();
  e.stopPropagation();
}

// draw a patch line between two boxes
function canvas_draw_patchline(p0, p1) {
  var ydiff = Math.max(20, Math.abs(p1.y - p0.y) * 0.33);
  var c0 = {
    x: p0.x,
    y: p0.y + ydiff
  }
  var c1 = {
    x: p1.x,
    y: p1.y - ydiff
  }
  context.beginPath();
  context.moveTo(p0.x, p0.y);
  context.bezierCurveTo(c0.x, c0.y, c1.x, c1.y, p1.x, p1.y);
  context.stroke();
}

// draw the patcher graphics (patchline cables)
function update_canvas() {

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.lineWidth = 1;
  context.strokeStyle = "#333";

  for (var line of patcher.lines) {
    var src_box = patcher.boxes[line.source.id];
    var src_div = box_div(src_box.id);
    var src_idx = line.source.idx;
    var src_offset = src_div.offset();

    var dst_box = patcher.boxes[line.destination.id];
    var dst_div = box_div(dst_box.id);
    var dst_idx = line.destination.idx;
    var dst_offset = dst_div.offset();

    var src_port_width = (src_div.outerWidth() - port_width) / Math.max(1, src_box.numoutlets - 1);
    var dst_port_width = (dst_div.outerWidth() - port_width) / Math.max(1, dst_box.numinlets - 1);

    var p0 = {
      x: src_offset.left + port_width_half + src_idx * src_port_width,
      y: src_offset.top + src_div.outerHeight()
    }

    var p1 = {
      x: dst_offset.left + port_width_half + dst_idx * dst_port_width,
      y: dst_offset.top
    }

    canvas_draw_patchline(p0, p1);
  }

  // draw the temporary line being created in the editor:
  if (line_editor_started.inlet) {

    var offset = line_editor_started.inlet.offset();
    var p0 = mousepos;
    var p1 = {
      x: offset.left + port_width_half,
      y: offset.top
    }
    canvas_draw_patchline(p0, p1);

  } else if (line_editor_started.outlet) {

    var offset = line_editor_started.outlet.offset();
    var p0 = {
      x: offset.left + port_width_half,
      y: offset.top
    }
    var p1 = mousepos;
    canvas_draw_patchline(p0, p1);
  }
}

// convert a maxpat-format object into our local representation:
function import_maxpat(maxpat) {
  // local representation:
  patcher = {
    boxes: {},
    lines: [],
  };

  // iterate the max boxes:
  for (var o of maxpat.boxes) {
    var maxbox = o.box;

    var box = box_new(maxbox.text, maxbox.id, maxbox.numinlets, maxbox.numoutlets);

    // reposition div according to patcher definition:
    box_div(box.id)
      .offset({
        left: maxbox.patching_rect[0],
        top: maxbox.patching_rect[1],
      });
  }

  // iterate the patcher lines:
  for (var o of maxpat.lines) {
    var patchline = o.patchline;
    var src_box = patcher.boxes[patchline.source[0]];
    var src_idx = patchline.source[1];
    var dst_box = patcher.boxes[patchline.destination[0]];
    var dst_idx = patchline.destination[1];

    var line = {
      source: {
        id: patchline.source[0],
        idx: patchline.source[1]
      },
      destination: {
        id: patchline.destination[0],
        idx: patchline.destination[1]
      },
    }
    patcher.lines.push(line);

    dst_box.inlets[dst_idx].sources.push(
      src_box.outlets[src_idx].name
    );
  }

  return patcher;
}

// function called when page is fully loaded:
$(function() {
  // add UI handlers to the box editor (hidden until a box is edited)
  box_editor
    .appendTo(patcher_div)
    .hide()
    .bind('keyup keydown update', box_editor_edit)
    .bind('blur', box_editor_done);

  // add UI handlers to the canvas:
  $("#patcher_canvas")
    //.width(patcher_div.width())
    //.height(patcher_div.height())
    .on("mousedown", function(e) {
      box_editor_done();
      delete box_editor_started.element;
      mousepos.x = e.pageX;
      mousepos.y = e.pageY;
    })
    .on("mousemove", function(e) {
      mousepos.x = e.pageX;
      mousepos.y = e.pageY;

      // continuously redraw if we are currently drawing a line:
      if (line_editing) {
        update_canvas();
      }
    })
    .on("mouseup", function(e) {
      line_editor_discard();
    });

  // we'll turn this off while editing:
  $("body").on("keydown", patcher_keydown);

  // necessary hack to resize canvas automatically
  window.addEventListener('resize', resize_canvas, false);

  // convert the maxpat into our local representation:
  patcher = import_maxpat(maxpat);
  // show it in the side panel:
  show_patcher_json();
  // draw patcher cables:
  resize_canvas();
});

// necessary hack to make canvas proper resolution
function resize_canvas() {
  var w = $(".patcher_container").width(),
    h = $(".patcher_container").height();
  canvas.width = w;
  canvas.height = h;
  update_canvas();
}