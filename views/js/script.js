var socket = io.connect("http://local.winneon.moe"),
    $content,
	$wrap,
	$height;
$(document).ready(function(){
	$content = $("div.page");
	$wrap    = $("div.wrap");
	$height  = 0;

	setTimeout(function(){
		set_heights(false);
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

	socket.on("login_fail", function(){
		alert("Login failed.");
	});

	socket.on("register_fail", function(){
		alert("Register failed.");
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
				});
			});
		});
	}
});

function register_events(){
	$("div.wrap button").on("click", function(){
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
		return false;
	});
}

function unregister_events(){
	$("div.wrap button").off();
}

function set_heights(animate){
	$wrap.attr("style", "");
	$wrap.height($wrap.height());
	$height = $wrap.outerHeight() - $content.height();
}