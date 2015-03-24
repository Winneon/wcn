var utils = require("./utils.js");

function Router(router, app, users, dj){
	router.use(function(req, res, next){
		utils.set_headers(res);
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

	router.post("/api/register", function(req, res){
		if (users.register({
			code: req.body.code,
			password: req.body.password
		})){
			res.json({
				success: true
			});
		} else {
			res.json({
				success: false
			});
		}
	});

	router.post("/api/login", function(req, res){
		if (users.login(req.body.username, req.body.password)){
			res.json({
				success: true
			});
		} else {
			res.json({
				success: false
			});
		}
	});

	// The remaining code below is for deprecated dJ external requests.

	router.post("/api/dj", function(req, res){
		if (req.body.type){
			if (req.body.data && req.body.data.username && req.body.data.password){
				if (!users.login(req.body.data.username, req.body.data.password)){
					res.json({
						type: "message",
						data: {
							error: true,
							message: "You did not provide valid login credentials!"
						}
					});
					return;
				}
			}
			switch (req.body.type){
				default:
					res.json({
						type: "message",
						data: {
							error: true,
							message: "Unknown request type!"
						}
					});
					break;
				case "add":
					dj.add_song(false, undefined, req.body.data.link, req, res);
					break;
				case "remove":
					dj.remove_song(false, undefined, req, res);
					break;
				case "remove_playlist":
					dj.remove_playlist(false, undefined, req.body.data.link, req, res);
					break;
				case "veto":
					if (users.get_user(req.body.data.username).staff){
						dj.veto_song(false, undefined, req, res);
					}
					break;
				case "refresh":
					dj.send_queue(false, req, res);
					break;
			}
		} else {
			res.json({
				type: "message",
				data: {
					error: true,
					message: "You did not specify a request type!"
				}
			});
		}
	});

	app.use(router);

	return this;
}

module.exports = Router;