var maxpat = {
  "patcher": {
    "boxes": [{
      "box": {
        "id": "obj-5",
        "maxclass": "newobj",
        "numinlets": 1,
        "numoutlets": 1,
        "patching_rect": [219.0, 287.0, 37.0, 22.0],
        "text": "out 2"
      }

    }, {
      "box": {
        "id": "obj-1",
        "maxclass": "newobj",
        "numinlets": 1,
        "numoutlets": 1,
        "outlettype": [""],
        "patching_rect": [50.0, 14.0, 20.0, 22.0],
        "text": "in"
      }

    }, {
      "box": {
        "id": "obj-2",
        "maxclass": "newobj",
        "numinlets": 1,
        "numoutlets": 1,
        "outlettype": [""],
        "patching_rect": [305.0, 14.0, 30.0, 22.0],
        "text": "in 3"
      }

    }, {
      "box": {
        "id": "obj-3",
        "maxclass": "newobj",
        "numinlets": 2,
        "numoutlets": 2,
        "outlettype": ["", ""],
        "patching_rect": [176.0, 149.0, 53.0, 22.0],
        "text": "cartopol"
      }

    }, {
      "box": {
        "id": "obj-4",
        "maxclass": "newobj",
        "numinlets": 1,
        "numoutlets": 1,
        "patching_rect": [176.0, 418.0, 37.0, 22.0],
        "text": "out 1"
      }

    }],
    "lines": [{
      "patchline": {
        "destination": ["obj-3", 0],
        "disabled": 0,
        "hidden": 0,
        "source": ["obj-1", 0]
      }

    }, {
      "patchline": {
        "destination": ["obj-3", 1],
        "disabled": 0,
        "hidden": 0,
        "source": ["obj-2", 0]
      }

    }, {
      "patchline": {
        "destination": ["obj-4", 0],
        "disabled": 0,
        "hidden": 0,
        "source": ["obj-3", 0]
      }

    }, {
      "patchline": {
        "destination": ["obj-5", 0],
        "disabled": 0,
        "hidden": 0,
        "source": ["obj-3", 1]
      }

    }]
  }
};

function random(n) {
  if (n === undefined) return Math.random();
  else return Math.floor(Math.random() * n);
}

function pick(arr) {
  return arr[random(arr.length)];
}

var unique_patcher_id = (function() {
  var id = 1000;
  return function(prefix) {
    if (prefix === undefined) {
      prefix = "Thing";
    }
    return prefix + "-" + id++;
  }
})();

function box_new(pat, newbox) {
  if (newbox == undefined) newbox = {};
  if (newbox.id == undefined) newbox.id = unique_patcher_id("obj");
  if (newbox.maxclass == undefined) newbox.maxclass = "newobj";
  if (newbox.text == undefined) newbox.text = "";
  if (newbox.numinlets == undefined) newbox.numinlets = 1;
  if (newbox.numoutlets == undefined) newbox.numoutlets = 1;
  if (newbox.position == newbox) newbox.position = {};
  if (newbox.position.x == undefined) newbox.position.x = 40;
  if (newbox.position.y == undefined) newbox.position.y = 40;

  pat.boxes.push(newbox);
  pat.map[newbox.id] = newbox;
  return newbox;
}

function line_new(pat, newline) {
  if (newline == undefined) newline = {};
  if (newline.id == undefined) newline.id = unique_patcher_id("line");
  if (newline.source == undefined) newline.source = {};
  if (newline.source.box == undefined) newline.source.box = pick(pat.boxes);
  if (newline.source.index == undefined) newline.source.index = random(newline.source.box.numoutlets);
  if (newline.destination == undefined) newline.destination = {};
  if (newline.destination.box == undefined) newline.destination.box = pick(pat.boxes);
  if (newline.destination.index == undefined) newline.destination.index = random(newline.destination.box.numoutlets);

  pat.lines.push(newline);
  pat.map[newline.id] = newline;
  return newline;
}

function maxpat_simplify(maxpat) {
  var boxes = [],
    lines = [],
    map = {};

  var pat = {
    boxes: boxes,
    lines: lines,
    // map is a reverse lookup from box.id or line.id to box or line
    map: map,
  };

  for (var i in maxpat.patcher.boxes) {
    var box = maxpat.patcher.boxes[i].box;

    box_new(pat, {
      id: box.id,
      maxclass: box.maxclass,
      text: box.text,
      numinlets: box.numinlets,
      numoutlets: box.numoutlets,
      position: {
        x: box.patching_rect[0],
        y: box.patching_rect[1]
      },
    });
  }

  for (var i in maxpat.patcher.lines) {
    var line = maxpat.patcher.lines[i].patchline;
    line_new(pat, {
      source: {
        box: pat.map[line.source[0]],
        index: line.source[1]
      },
      destination: {
        box: pat.map[line.destination[0]],
        index: line.destination[1]
      },
    });
  }

  return pat;
}

var pat = maxpat_simplify(maxpat);

//////////////////////////////////////////////////////////////////////

// some style parameters:
var inletwidth = 10;
var inletpad = inletwidth / 2;

// drawing patchboxes with D3 and HTML <div>
// drawing patchlines with D3 and SVG <path>
var svg = d3.select("#svgcanvas");

var box_drag = d3.behavior.drag()
  .origin(function(d) {
    return d;
  })
  .on("drag", function(d, i) {
    d.position.x += d3.event.dx;
    d.position.y += d3.event.dy;
    pat.dirty = true;
  });

function update_patcher() {

  // use D3 to manage the patcher box divs:
  var maxboxes = d3.select("body").selectAll(".maxbox")
    .data(pat.boxes, function(d) {
      return d.id;
    });

  // EXIT
  // mark data as obsolete (for external referents)
  // and remove from view
  maxboxes.exit()
    .each(function(d, i) {
      d.obsolete = true;
    })
    .remove();

  // ENTER
  // create new maxboxes:
  maxboxes.enter()
    .append("div")
    .attr("class", "maxbox")
    /*
    .on("mousedown", function(d) {
      d3.event.preventDefault();  // prevent text selection
        console.log(d.text);
    
    //var target = $(e.target)
	//if (target.hasClass("inlet") || target.hasClass("outlet")) {
		// switch to processing inlets/outlets directly here?
		//return;
	//}
    d3.event.stopPropagation();
    
    })*/
    .call(box_drag)
    .on("click", function(d, i) {
      // check whether click was suppressed (e.g. by drag behavior)
      if (d3.event.defaultPrevented) return;
      // TODO: open editor here
      console.log("edit max box", d.id, d.text);
    });

  // UPDATE
  // update position & contents:
  maxboxes.text(function(d, i) {
    d.div = this; // create a reverse reference
    $(this).offset({
      left: d.position.x,
      top: d.position.y,
    });
    return d.text;
  });

  // remove lines connected to obsolete objects
  // (loop in reverse for safe removal/traversal):
  for (var i = pat.lines.length - 1; i >= 0; i--) {
    var d = pat.lines[i];
    if (d.source.box.obsolete === true || d.destination.box.obsolete === true) {
      pat.lines.splice(i, 1);
    }
  }

  // use D3 to manage the patchline svg paths:
  var lines = svg.selectAll("path")
    .data(pat.lines, function(d) {
      return d.id;
    });

  // EXIT:
  lines.exit().remove();

  // ENTER:
  lines
    .enter()
    .append("path")
    .on("click", function(d) {
      console.log("click on line", d.id);
      d.selected = !d.selected;
      pat.dirty = true;
    })
    .on("mouseover", function(d) {
      //$(this).attr("class", "patchlinehover");
    })
    .on("mouseout", function(d) {
      //$(this).attr("class", "patchline");
    });

  // UPDATE:
  lines
    .attr("class", function(d, i) {
      if (d.selected) {
        console.log("selected", d.id);
        return "patchlinehover";
      } else {
        return "patchline";
      }
    }).attr("d", function(d) {
      var src = d.source.box;
      var dst = d.destination.box;

      var srcdiv = $(src.div);
      var dstdiv = $(dst.div);

      var srcoff = inletpad;
      if (src.numoutlets > 1) srcoff += (srcdiv.outerWidth() - inletwidth) * d.source.index / (src.numoutlets - 1);
      var dstoff = inletpad;
      if (dst.numinlets > 1) dstoff += (dstdiv.outerWidth() - inletwidth) * d.destination.index / (dst.numinlets - 1);
      // src & dst points:
      var p0 = {
        x: src.position.x + srcoff,
        y: src.position.y + srcdiv.outerHeight()
      };
      var p1 = {
        x: dst.position.x + dstoff,
        y: dst.position.y
      };
      // control points:
      var ydiff = Math.max(20, Math.abs(p1.y - p0.y) * 0.33);
      var c0 = {
        x: p0.x,
        y: p0.y + ydiff
      };
      var c1 = {
        x: p1.x,
        y: p1.y - ydiff
      };
      // build bezier:
      var path = "M" + p0.x + "," + p0.y +
        "C" + c0.x + "," + c0.y + " " +
        c1.x + "," + c1.y + " " +
        p1.x + "," + p1.y + " ";
      return path;
    });
}

function simulate_edit() {

  pat.boxes.splice(random(pat.boxes.length), 1);
  var newbox = box_new(pat, {
    text: "hello",
    position: {
      x: random(400),
      y: random(400)
    }
  });

  pat.lines.splice(random(pat.lines.length), 1);

  line_new(pat, {
    destination: {
      box: newbox
    }
  });
  line_new(pat, {
    source: {
      box: newbox
    }
  });
  line_new(pat);

  pat.dirty = true;
}

pat.dirty = true;
setInterval(simulate_edit, 2000);

function animate() {
  requestAnimationFrame(animate);

  if (pat.dirty) {
    pat.dirty = false;
    update_patcher();
  }
}
animate();

function patcher_keydown(e) {
  /*
  if (box_editing) return;
	switch(e.which) {
		case 78: { // 'n'
			var box = box_new();
			box_editor_start(box_div(box.id));
			break;
		}
		case 83: { // 's'
			show_patcher_json();
			break;
		}	
		default: 
			console.log("key", e.which);
			return;
	}
  */
  e.preventDefault();
  e.stopPropagation();
}