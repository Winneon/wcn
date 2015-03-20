const express  = require("express"),
      session  = require("express-session"),
      cookie   = require("cookie-parser"),
      http_mod = require("http"),
      proxy    = require("http-proxy"),
      parser   = require("body-parser"),
      socketio = require("socket.io"),
      path     = require("path"),
      fs       = require("fs"),
      request  = require("request");

const utils    = require("./utils.js"),
      users    = require("./users.js"),
      config   = require("./config.json"),
      welcome  = "WCN // VERSION " + config.version;

const app      = express(),
      http     = http_mod.Server(app),
      router   = express.Router(),
      io       = socketio(http);

console.log_copy = console.log.bind(console);
console.log = function(data){
	this.log_copy("[" + utils.timestamp() + "]: >", data);
};

console.log(welcome);

var line = "";
for (var i = 0; i < welcome.length; i++){
	line += "-";
}

console.log(line);
console.log("STATUS");

app.set("view engine", "jade");
app.set("views", path.join(__dirname, "views"));

app.use(parser.urlencoded({
	extended: true
}));

app.use(express.static(app.get("views")));
app.use(parser.json());
app.use(cookie());

router.use(function(req, res, next){
	if (req.cookies.user && users.get_user(req.cookies.user)){
		res.clearCookie("user");
		res.redirect("/login/");
	} else {
		if (req.cookies.user){
			try {
				req.cookies.user = users.decrypt(req.cookies.user);
			} catch (e){
				res.clearCookie("user");
				req.cookies.user = undefined;
			}
		}
	}
	try {
		next();
	} catch (e) {
		console.log("ERROR: HTTP REQUEST");
		console.log(e.stack());
		res.end();
	}
});

router.post("/api/register_code/", function(req, res){
	if (req.body.check == config.check){
		req.body.uuid = req.body.uuid.replace(/-/g, "");
		request({
			url: "https://sessionserver.mojang.com/session/minecraft/profile/" + req.body.uuid,
			json: true
		}, function(error, response, data){
			if (!error && response.statusCode == 200){
				users.register_code({
					username: data.name,
					code: req.body.id,
					staff: req.body.staff
				});
				console.log("NEW CODE REGISTERED");
				console.log("- USERNAME: " + data.name);
				console.log("- CODE: " + req.body.id);
				res.json({
					success: true
				});
			} else {
				console.log("ERROR REGISTERING CODE");
				res.json({
					success: false
				});
			}
		});
	} else {
		res.json({
			success: false
		});
	}
});

app.use(router);

app.use(function(req, res, next){
	res.locals.basedir = app.get("views");
	res.locals.url     = req.url.split("?")[0];
	res.locals.user    = req.cookies.user;
	next();
});

app.get("*", function(req, res){
	var file = req.url.split("?")[0];
	if (file[file.length - 1] == "/"){
		file = file.substring(0, file.length - 1);
	}
	if (file == ""){
		file = "/index"
	}
	file = file.replace("/", "");
	if (fs.existsSync(path.join("views", file))){
		res.end();
	} else if (fs.existsSync(path.join("views", file + ".jade"))){
		res.render(file, function(err, html){
			if (err){
				console.log(err);
				res.redirect("/error/");
			} else {
				res.end(html);
			}
		});
	} else {
		res.redirect("/404/");
	}
});

io.on("connection", function(socket){
	socket.ip = socket.request.socket.remoteAddress;
	socket.user = socket.handshake.headers.cookie;
	console.log("NEW CONNECTION: " + socket.ip);
	if (socket.user.indexOf("user=") > -1){
		socket.user = users.decrypt(socket.user.substring(socket.user.indexOf("user="), socket.user.length).replace("user=", ""));
		console.log("- USERNAME: " + socket.user);
	} else {
		socket.user = undefined;
	}
	socket.on("disconnect", function(){
		console.log("CLOSED CONNECTION: " + socket.ip);
	});
	socket.on("login", function(data){
		if (users.login(data.username, data.password)){
			utils.add_login_cookie(socket, users.encrypt(data.username));
			socket.emit("redirect", "/");
		} else {
			socket.emit("login_fail");
		}
	});
	socket.on("logout", function(){
		if (socket.user){
			socket.emit("clear_cookie", "user");
			socket.emit("redirect", "/");
		}
	});
	socket.on("register", function(data){
		if (users.register({
			code: data.code,
			password: data.password
		})){
			utils.add_login_cookie(socket, users.encrypt(users.file.codes[data.code]));
			socket.emit("redirect", "/");
		} else {
			socket.emit("register_fail");
		}
	});
});

http.listen(config.ports.server, function(){
	console.log("- WEBSERVER: SUCCESS");
	console.log("- SOCKET.IO: SUCCESS");
});

process.stdin.resume();
process.on("SIGINT", function(){
	console.log("TERMINATING WCN.");
	users.save();
	process.exit();
});