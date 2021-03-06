const express  = require("express"),
      session  = require("express-session"),
      cookie   = require("cookie-parser"),
      http_mod = require("http"),
      proxy    = require("http-proxy"),
      parser   = require("body-parser"),
      socketio = require("socket.io"),
      path     = require("path"),
      fs       = require("fs"),
      request  = require("request"),
      marked   = require("marked");

const utils    = require("./utils.js"),
      users    = require("./users.js"),
      config   = require("./config.json"),
      welcome  = "WCN // VERSION " + config.version;

const app      = express(),
      http     = http_mod.Server(app),
      router   = express.Router(),
      io       = socketio(http),
      dj       = require("./dj.js")(users, io);

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

// Register external API events
require("./router.js")(router, app, users, dj);

app.use(function(req, res, next){
	res.locals.basedir = app.get("views");
	res.locals.url     = req.url.split("?")[0];
	res.locals.user    = req.cookies.user;
	if (req.cookies.user){
		res.locals.staff = users.get_user(req.cookies.user).staff;
	} else {
		res.locals.staff = false;
	}
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
	} else {
		var cont = false;
		if (file.indexOf("edit") == 0){
			if (file == "edit"){
				file = "edit/index"
			}
			var editing  = file.replace("edit/", ""),
			    contents = "";
			if (fs.existsSync(path.join("views", editing + ".jade"))){
				res.locals.contents = fs.readFileSync(path.join("views", editing + ".jade"), {
					encoding: "utf8"
				}).replace(/\r/g, "").replace("extends /core\nblock content\n", "").replace("\t", "").replace(/\n\t/g, "\n");
			}
			file = "edit";
			cont = true;
		} else if (fs.existsSync(path.join("views", file + ".jade"))){
			cont = true;
		} else {
			res.redirect("/404/");
		}
		if (cont){
			res.render(file, function(err, html){
				if (err){
					console.log(err);
					res.redirect("/error/");
				} else {
					res.end(html);
				}
			});
		}
	}
});

io.on("connection", function(socket){
	socket.ip = socket.request.socket.remoteAddress;
	socket.user = socket.handshake.headers.cookie;
	console.log("NEW CONNECTION: " + socket.ip);
	// Dank cookie parsing
	if (socket.user && socket.user.indexOf("user=") > -1){
		var parsed = socket.user.substring(socket.user.indexOf("user="), socket.user.length).replace("user=", "");
		if (parsed.indexOf(";") > -1){
			parsed = parsed.substring(0, parsed.indexOf(";"));
		}
		socket.user = users.decrypt(parsed);
		console.log("- USERNAME: " + socket.user);
	} else {
		socket.user = undefined;
	}
	if (socket.handshake.headers.referer && socket.handshake.headers.referer[socket.handshake.headers.referer.length - 1] != "/"){
		socket.emit("redirect", socket.handshake.headers.referer + "/");
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
	socket.on("edit", function(data){
		if (socket.user && users.get_user(socket.user).staff){
			data.text = "extends /core\nblock content\n\t" + data.text.replace(/\n/g, "\n\t");
			fs.writeFileSync(path.join("views", data.url + ".jade"), data.text);
			socket.emit("dynamic_redirect", data.url);
			console.log("EDITED PAGE: " + socket.user);
			console.log("- /" + data.url + ".jade");
		}
	});
	socket.on("dj_queue", function(){
		if (socket.user){
			dj.send_queue(true);
		}
	});
	socket.on("dj_add", function(link){
		if (socket.user){
			dj.add_song(true, socket, link);
		}
	});
	socket.on("dj_remove", function(){
		if (socket.user){
			dj.remove_song(true, socket);
		}
	});
	socket.on("dj_veto", function(){
		if (socket.user){
			if (users.get_user(socket.user).staff){
				dj.veto_song(true, socket);
			} else {
				socket.emit("dj_veto", false);
			}
		}
	});
});

http.listen(config.ports.server, function(){
	console.log("- WEBSERVER: SUCCESS");
	console.log("- SOCKET.IO: SUCCESS");
	console.log("- DJREQUEST: SUCCESS");
});

process.stdin.resume();
process.on("SIGINT", function(){
	console.log("TERMINATING WCN.");
	users.save();
	process.exit();
});