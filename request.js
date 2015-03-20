function Request(title, link, duration, user, thumb){
	var data = {};
	
	data.title = title;
	data.link = link;
	data.duration = duration;
	data.user = user;

	if (thumb != null || thumb != undefined){
		data.thumb = thumb;
	}
	
	return data;
}

module.exports = Request;