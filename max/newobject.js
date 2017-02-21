// inlets and outlets
inlets = 1;
outlets = 2;

var d = new Dict("newobject"); 

function json_dict(json){
	d.parse(json); 
	outlet(0, d);
	}