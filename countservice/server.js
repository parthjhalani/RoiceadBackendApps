var async_xsjs  = require("@sap/async-xsjs");
var xsenv = require("@sap/xsenv");
var port  = process.env.PORT || 4001;
xsenv.loadEnv();

var options = {
    anonymous: true,
	auditLog : { logToConsole: true }, // change to auditlog service for productive scenarios
	redirectUrl : "/index.xsjs"
};
// configure HANA
try {
	options = Object.assign(options, xsenv.getServices({ hana:  { label: 'hana' } }));
} catch (err) {
	console.log("[WARN]", err.message);
}

// configure UAA
try {
	options = Object.assign(options, xsenv.getServices({ uaa: {label: "xsuaa"} }));
} catch (err) {
	console.log("[WARN]", err.message);
}
async_xsjs(options).then((async_xsjs_server)=>{
	async_xsjs_server.listen(port, (err)=>{
	  if(!err) {
		console.log('Node XS server listening on port %d', port);
	  }else{
		console.log('Node XS server failed to start on port %d', port);
	  }
	});
  });
// var options = {
// 	anonymous : true, // remove to authenticate calls
// 	auditLog : { logToConsole: true }, // change to auditlog service for productive scenarios
// 	redirectUrl : "/index.xsjs"
// };



// start server
// xsjs(options).listen(port);

// console.log("Server listening on port %d", port);
