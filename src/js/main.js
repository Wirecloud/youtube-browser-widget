/* global MashupPlatform, StyledElements*/

(function () {

    "use strict";

    var _ = function _(text) {
        return text;
    };

    var build_header = function build_header(container) {

        container.addClassName('header');

        var youtube_link = document.createElement('a');
        youtube_link.href = "http://www.youtube.com";
        youtube_link.target = "_blank";
        youtube_link.innerHTML = '<img height="22" width="51" border="0" src="images/ytlogo_51x22.gif" />';

        container.appendChild(youtube_link);

        this.channel_select = new StyledElements.StyledSelect();
        container.appendChild(this.channel_select);
        this.channel_select.addEventListener('change', function (select) {
            this.youtube_source.changeOptions({base_url: select.getValue(), pageToken: null});
        }.bind(this));

        var btn_group = document.createElement('div');
        btn_group.className = 'btn-group pagination se-pagination';

        this.prev_button = new StyledElements.StyledButton({iconClass: 'icon-prev-page'});
        this.prev_button.insertInto(btn_group);
        this.prev_button.disable();
        this.prev_button.addEventListener('click', function () {
            this.youtube_source.changeOptions({pageToken: this.prevPageToken});
        }.bind(this));

        this.next_button = new StyledElements.StyledButton({iconClass: 'icon-next-page'});
        this.next_button.insertInto(btn_group);
        this.next_button.disable();
        this.next_button.addEventListener('click', function () {
            this.youtube_source.changeOptions({pageToken: this.nextPageToken});
        }.bind(this));

        container.appendChild(btn_group);
    };

    var rebuildChannelList = function rebuildChannelList() {
        this.channel_select.clear();
        var entries = [];
        for (var i = 0; i < channels.length; i++)  {
            entries.push({label: channels[i].label, value: channels[i].url});
        }
        this.channel_select.addEntries(entries);
    };

    var make_youtube_request = function make_youtube_request(page, options, onSuccess, onFailure) {

        var parameters = {
            'part': 'snippet',
            'maxResults': options.pageSize
        };
        if (options.pageToken) {
            parameters.pageToken = options.pageToken;
        }
        if (MashupPlatform.prefs.get('apikey')) {
            parameters.key = MashupPlatform.prefs.get('apikey');
        } else {
            parameters.key = 'AIzaSyAWyD23qgccqKfWko9fEzx5hPZxFYO4aC4';
        }

        MashupPlatform.http.makeRequest(options.base_url, {
            method: 'GET',
            parameters: parameters,
            onSuccess: function (response) {
                var data = JSON.parse(response.responseText);
                var response_info = {
                    'current_page': 1,
                    'total_count': 1
                };
                var videos = data.items;

                this.prevPageToken = data.prevPageToken;
                this.prev_button.setDisabled(this.prevPageToken == null);

                this.nextPageToken = data.nextPageToken;
                this.next_button.setDisabled(this.nextPageToken == null);

                onSuccess(videos, response_info);
            }.bind(this),
            onFailure: function () {
                onFailure();
            }
        });

    };

    var onentryclick = function onentryclick(video) {
        var video_info = {
            'title': video.snippet.title,
            'url': 'https://www.youtube.com/watch?v=' + video.id.videoId
        };

        if (video.georss$where != null) {
            video_info.location = video.georss$where.gml$Point.gml$pos.$t.split(' ').join(', ');
        }
        MashupPlatform.wiring.pushEvent('video', video_info);
    };

    var paintResults = function paintResults(videos) {
        var i, entry, thumbnail, title, container;

        container = this.layout.getCenterContainer();
        container.clear();

        for (i = 0; i < videos.length; i++) {
            entry = document.createElement('div');

            thumbnail = document.createElement('img');
            thumbnail.src = videos[i].snippet.thumbnails.default.url;
            entry.appendChild(thumbnail);

            title = document.createElement('span');
            title.textContent = videos[i].snippet.title;
            entry.appendChild(title);

            entry.addEventListener('click', onentryclick.bind(this, videos[i]), true);
            container.appendChild(entry);
        }
    };

    var YouTubeVideoSearch = function YouTubeVideoSearch() {

        MashupPlatform.wiring.registerCallback("keyword", this.doSearch.bind(this));

        MashupPlatform.widget.context.registerCallback(function (new_values) {
            if (this.layout && 'heightInPixels' in new_values) {
                this.layout.repaint();
            }
        }.bind(this));

        this.youtube_source = new StyledElements.PaginatedSource({
            'pageSize': 6,
            'requestFunc': make_youtube_request.bind(this),
            'processFunc': paintResults.bind(this)
        });

        this.youtube_source.addEventListener('requestStart', function () {
            this.layout.getCenterContainer().disable();
        }.bind(this));
        this.youtube_source.addEventListener('requestEnd', function (source, error) {
            if (error != null) {
                // this.resource_painter.setError(gettext('Connection error: No resources retrieved.'));
            }

            this.layout.getCenterContainer().enable();
        }.bind(this));
    };

    YouTubeVideoSearch.prototype.init = function init() {
        this.layout = new StyledElements.BorderLayout();

        build_header.call(this, this.layout.getNorthContainer());

        this.layout.getCenterContainer().addClassName('results loading');

        this.layout.insertInto(document.body);
        this.layout.repaint();
        this.load();
    };

    YouTubeVideoSearch.prototype.load = function load() {
        createChannels();
        rebuildChannelList.call(this);
        this.channel_select.setValue(channels[MashupPlatform.prefs.get('channel')].url);
        this.youtube_source.changeOptions({base_url: this.channel_select.getValue(), pageToken: null});
    };

    YouTubeVideoSearch.prototype.doSearch = function doSearch(query) {

        if (!query) {
            return;
        }

        var query_url = build_search_url(query);

        this.channel_select.addEntries([{label: 'search: ' + query, value: query_url}]);
        this.channel_select.setValue(query_url);
        this.youtube_source.changeOptions({base_url: query_url, pageToken: null});
    };

    var youtube_video_search = new YouTubeVideoSearch();
    document.addEventListener('DOMContentLoaded', youtube_video_search.init.bind(youtube_video_search), true);

    var channels = [];

    var createChannels = function createChannels() {
        channels = [
            {label: _("Popular on YouTube"), url: "https://www.googleapis.com/youtube/v3/search?order=rating"},
            {label: _("Music"), url: "https://www.googleapis.com/youtube/v3/search?videoCategoryId=10&order=rating&type=video"},
            {label: _("Sports"), url: "https://www.googleapis.com/youtube/v3/search?videoCategoryId=17&orderby=rating&type=video"},
            {label: _("Games"), url: "https://www.googleapis.com/youtube/v3/search?videoCategoryId=20&orderby=rating&type=video"},
            {label: _("Movies"), url: "https://www.googleapis.com/youtube/v3/search?videoCategoryId=30&orderby=rating&type=video"}
        ];
    };

    // Search helper
    var build_search_url = function build_search_url(query) {
        return "https://www.googleapis.com/youtube/v3/search?q=" + encodeURIComponent(query);
    };

})();
