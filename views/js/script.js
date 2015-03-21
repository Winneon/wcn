var socket = io.connect(window.location.origin),
    $content,
	$wrap,
	$height;
$(document).ready(function(){
	$content = $("div.page");
	$wrap    = $("div.wrap");
	$height  = 0;

	setTimeout(function(){
		set_heights();
	}, 1000);

	$(function(){
		if (Modernizr.history){
			$("nav").find("a").on("click", function(){
				var href = $(this).attr("href");
				if (href != "javascript:void(0)"){
					history.pushState(null, null, href);
					dynamic_load(href);
				}
				return false;
			});
		}
		$("ul.drop a").on("click", function(){
			$("ul.drop").addClass("disable");
			setTimeout(function(){
				$("ul.drop").removeClass("disable");
			}, 50);
		});
		$("a.logout").on("click", function(){
			socket.emit("logout");
		});
	});

	register_events();

	$(window).bind("popstate", function(){
		dynamic_load(location.pathname);
	});

	socket.on("create_cookie", function(data){
		document.cookie = data.name + "=" + data.value + data.expires + "; path=/";
	});

	socket.on("clear_cookie", function(cookie){
		document.cookie = cookie + "=dummy; Max-Age=0; path=/";
	});

	socket.on("redirect", function(location){
		window.location.assign(location);
	});

	socket.on("dynamic_redirect", function(location){
		location = "/" + location + "/";
		history.pushState(null, null, location);
		dynamic_load(location);
	});

	socket.on("login_fail", function(){
		alert("Login failed.");
	});

	socket.on("register_fail", function(){
		alert("Register failed.");
	});

	socket.on("dj_queue", function(data){
		var disabled = false;
		var children = $("table.dj tbody").children();
		for (var i = 0; i < 10; i++){
			var row      = $(children[i]).children(),
			    name     = $(row[1]),
			    username = $(row[2]),
			    duration = $(row[3]);
			if (queue[i]){
				name.html($("<a/>", {
					"href": queue[i].link,
					"target": "_blank"
				}).html(queue[i].title));
				username.html(queue[i].user);
				var mins  = Math.floor(queue[i].duration / 60),
				    hours = queue[i].duration / 60 / 60;
				    secs  = queue[i].duration % 60,
				    full  = "";
				if (secs < 10){
					secs = "0" + secs;
				}
				if (hours >= 1){
					full += hours + ":";
				}
				duration.html(full + [mins, secs].join(":"));
				if (queue[i].user == user){
					disabled = true;
				}
			} else {
				if (name.html() != "-"){
					name.html("-");
				}
				if (username.html() != ""){
					username.html("-");
				}
				if (duration.html() != "00:00"){
					duration.html("00:00");
				}
			}
		}
		$("input[name='add_song']").prop("disabled", disabled);
	});

	socket.on("dj_add", function(success){
		if (!success){
			var $input = $("input[name='add_song'");
			$input.css("border-color", "#DA2B2B");
			$input.css("box-shadow", "0px 1px 0px #DA2B2B");
			$input.prop("disabled", false);
			setTimeout(function(){
				$input.attr("style", "");
			}, 2000);
		}
	});

	socket.on("dj_remove", function(success){
		if (!success){
			var $button = $("button[name='remove_song'");
			$button.css("background-color", "#DA2B2B");
			setTimeout(function(){
				$button.attr("style", "");
			}, 2000);
		} else {
			$(this).prop("true", true);
		}
	});

	socket.on("dj_veto", function(success){
		if (!success){
			var $button = $("button[name='veto_song'");
			$button.css("background-color", "#DA2B2B");
			setTimeout(function(){
				$button.attr("style", "");
			}, 2000);
		}
	});

	function dynamic_load(href){
		$content.find("div.content").fadeOut(200, function(){
			$content.hide().load(href + " div.content", function(){
				$wrap.animate({
					height: ($height + $content.height()) + "px"
				}, 200);
				$content.fadeIn(200, function(){
					unregister_events();
					register_events();
					$("a.edit").attr("href", "/edit" + window.location.pathname);
				});
			});
		});
	}
});

function register_events(){
	$("div.wrap button").on("click", function(event){
		var name = $(this).attr("name");
		if (name == "login" || name == "register"){
			var $username = $("input[name='username']"),
			    $password = $("input[name='password']"),
			    $code     = $("input[name='code']"),
			    cont      = true;
			if ($username.val() == ""){
				$username.css("border-color", "#DA2B2B");
				$username.css("box-shadow", "0px 1px 0px #DA2B2B");
				cont = false;
			}
			if ($password.val() == ""){
				$password.css("border-color", "#DA2B2B");
				$password.css("box-shadow", "0px 1px 0px #DA2B2B");
				cont = false;
			}
			if (cont){
				if (name == "register" && $("input[name='code']").length == 0){
					var code = $("<input/>", {
						"type": "text",
						"name": "code",
						"placeholder": "Code"
					});
					$("input[name='password']").after(code);
					set_heights();
				} else {
					socket.emit(name, {
						username: $username.val(),
						password: $password.val(),
						code: $code.val() || ""
					});
				}
			} else {
				setTimeout(function(){
					$username.attr("style", "");
					$password.attr("style", "")
				}, 2000);
			}
		}
		switch (name){
			case "edit":
				var text = $("textarea").val();
				var url = window.location.pathname.substring(0, window.location.pathname.length - 1).replace("/edit/", "");
				if (url == "/edit"){
					url = "index";
				}
				socket.emit("edit", {
					url: url,
					text: text
				});
				break;
			case "remove_song":
				socket.emit("dj_remove");
				break;
			case "veto_song":
				socket.emit("dj_veto");
				break;
		}
		return false;
	});
	$("div.wrap input").on("keydown", function(event){
		var name = $(this).attr("name");
		if (event.which == 13){
			if (name == "username" || name == "password"){
				$("button[name='login']").trigger("click");
			}
			switch (name){
				case "add_song":
					socket.emit("dj_add", $(this).val());
					$(this).val("");
					$(this).prop("disabled", true);
					break;
			}
			return false;
		}
	});
	var add_input = document.getElementsByTagName("input");
	for (var i = 0; i < add_input.length; i++){
		if (add_input[i].name == "add_song"){
			add_input[i].onpaste = function(event){
				var clipboard = event.clipboardData.getData("text/plain");
				socket.emit("dj_add", clipboard);
				$(this).prop("disabled", true);
				return false;
			};
		}
	}
}

function unregister_events(){
	$("div.wrap button").off();
	$("div.wrap input").off();
}

function set_heights(){
	$wrap.attr("style", "");
	$wrap.height($wrap.height());
	$height = $wrap.outerHeight() - $content.height();
}