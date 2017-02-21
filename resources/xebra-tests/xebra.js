
var xebraState = new Xebra.State({
	hostname: "127.0.0.1",
	port: 8080,
	supported_objects: Xebra.SUPPORTED_OBJECTS
});
xebraState.connect();

xebraState.on("object_added", function(object) {
	console.log("Added new object", object);
});

xebraState.on("object_removed", function(object) {
	console.log("Removed an object", object);
});