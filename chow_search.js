// Public Dropbox link to this file https://www.dropbox.com/s/doskkjt2sw21ep2/search_example.js

// This JavaScript File runs the search results page on http://chow.com
// You can see a sample query here http://www.chow.com/search?beef#!q=beef&o=rank
// because SEO was not a factor, the search results are requested on page-load
// additional results are dynamically loaded when the page is scroll to the bottom of the current results

var Search = {
    params: "", //used for the serialize form
    numberOfResults : 0,
    searchHost: window.location.host,
    resultHTML: '', //main variable that is concatenated and rendered as the result
    descriptionLength: 130, //this will probably need to be expanded for mobile
    tagsParams: "",
    totalResults: "",
    num_recipes: "",
    num_topics: "",
    num_videos: "",
    num_wp_posts: "",
    num_product_reviews: "",
    terms: [],
    loadScroll: true, //flag so we don't try multiple times before we get the next page
    doingNextPage: false, //flag so we know that the contents get appended instead of overwriting
    googleAdsLoaded: false, // we want to load it when the first search results come back
    //category_count: {}, //temp for debugging

    //feedback form variables
    //This is used by admins to fine tune search rela
    showFeedbackForm: false, //These next six can probably go away if we are no longer using the feedback form (ask Suzy)
    queryString: "",
    catString: "",
    baseIndex: 0, //gets set with $j("input:hidden[name=start]").val()
    rankIndex: 0, // this gets added to the baseIndex for the feedback form so we know how that item is ranked
    itemFeedbackForm: "",

    //section variables - these are reset after each item by calling Search.clearVariables()
    itemMatch: "",       //each item in the object
    itemSection: "",     //what the section is call ie. recipes, holiday recipes, discussions
    itemLink: "",
    itemTitle: "",
    itemDesc: "",
    itemImageURL: "",
    itemImageHTML: "",   //image tag and link
    itemImageClass: "",  //only used when an item has an image
    itemId: "",
    itemDate: "",        //this is only use in some of the items
    itemTopicsMeta: "",  //used on topics for Board Name, Last updated and number of replies
    itemMeta: "", //used on recipes and product reviews for Rating and recipes for Difficulty and Total Time
    itemWp_postsMeta: "",//used for wordpress author and date
    itemHasImage: false, //not all items have images
    itemHasDesc: false,  //not all items have descriptions


    init: function() {
        Search.addListeners();
        Search.getParams();
    },

    addListeners: function() {
        $j("#searchForm").submit(function(e){
            e.preventDefault();
            Search.getParams();
        });

        //this is the listener for the feedback form which usually it turned off, see the showFeedbackForm variable above
        $j("#results_and_ads").on("submit", "form.ajaxForm", function(e){
            e.preventDefault();
            var that = $j(this),
                url = that.attr('action'),
                type = that.attr('method');
            $j.ajax({
                url: url,
                type: type,
                data: that.serialize(),
                success: function(response) {
                    that.find(":submit").attr('value', 'Rated');
                }
            });
            return false;
        });

        Search.endlessScroll(); //adds the scroll listener

        // FILTERS
        $j(".category").click(function(){
            var category = $j(this);
            var categoryId = category.attr("id");

            // uncheck other categories when a top level category is checked
            $j(".category:not(#"+categoryId+")").attr("checked", false);
            // close sub categories
            $j(".secondary_filters").hide('blind', { direction: 'vertical' }, 200);
            // disable inputs other than categories
            $j(".categories input:not(.category)").attr("disabled", "disabled").attr("checked", false);
            // close nested children
            $j(".input_wrapper").hide();
            // default to all years
            $j("#time_option_all").attr("checked", "checked");
            // collapse board groups
            $j(".boardgroup").removeClass("open");

            if(category.attr("checked") =="checked"){
                //enable all children inputs except type=hidden and ones with class='disabled_when_hidden'
                category.closest("li").find("input[type!='hidden']").filter(":not(.disabled_when_hidden)").attr('disabled',false);
            } else {
                // uncheck all children and disable them
                category.closest("li").find("input:not(.category)").attr("checked", false).attr('disabled',true);
                // close nested children
                $j(".input_wrapper").hide();
                $j("#time_option_all").attr("checked", "checked");
            }

            // show/hide children
            category.closest("li").children(".secondary_filters").toggle('blind', { direction: 'vertical' }, 200);

            // check #all_categories if everything else is unchecked
            if( $j(".category:checked").length == 0 ){
                $j("#all_categories").attr("checked", "checked")
            }
        });

        $j(".boardgroup").click(function(){
            $j(this).toggleClass("open");
            $j(this).next(".boardgroup_list").toggle('blind', { direction: 'vertical' }, 200);
            $j(this).children("input").attr('disabled', function(idx, oldAttr) {
                // toggle 'disabled' attribute
                return !oldAttr;
            });
        });

        $j("input[name='time_option']").change(function(){
            var el = $j(this);
            el.siblings("input").attr('disabled',false);

            //disable the "after" param in the siblings if they are not selected
            if ( !$j("#time_option_month").is(":checked") == true ) {
                $j("#time_option_month").siblings("input").attr('disabled',true);
            }
            if ( !$j("#time_option_year").is(":checked") == true ) {
                $j("#time_option_year").siblings("input").attr('disabled',true);
            }

            //show hide time custom time
            if( el.attr("id") == "time_option_custom" && el.attr("checked") == "checked") {
                $j("#date_select").show('blind', { direction: 'vertical' }, 200).children().attr('disabled', false);
            } else {
                $j("#date_select").hide('blind', { direction: 'vertical' }, 200).children().attr('disabled', true);
            }
        });

        var datePickerOptions = {
            dateFormat: "yy-mm-dd",
            yearRange: "1999:+0",
            showOn: "button",
            buttonImage: "/s/calbtn.gif",
            buttonImageOnly: true,
            changeMonth: true,
            changeYear: true,
            minDate: new Date("1-1-1999"),
            maxDate: new Date()

        };

        $j("#date_start").datepicker(datePickerOptions);

        $j("#date_end").datepicker(datePickerOptions);

        $j("#show_user_name").click(function(){
            $j("#user_name").toggle('blind', { direction: 'vertical' }, 200).attr('disabled', function(idx, oldAttr) {
                // toggle 'disabled' attribute
                return !oldAttr;
            });
        });

        $j("input").not("#input_query").not(".search_submit").click(function(){ Search.getParams(); });

    }, //end listeners

    getParams: function() {
        if ($j('#input_query').val() != ""){
            if (!Search.doingNextPage) {
                $j("#results_above_ad").html("<img src='/s/blender.gif' style='margin:10px auto; display:block'>");
                $j("#results_below_ad").html("");
                $j("input:hidden[name=start]").val(0); //if we are doing a new search and not a xhr "next page" then reset the start from result
            }
            Search.params = $j("#searchForm").serialize();
            Search.getSearchResults();
        } else {
            Search.zeroResultsPage();
        }
    },

    getSearchResults: function() {
        if ("pushState" in history) { //this will stop history from being added in newer browser when we change the "#!"
            history.replaceState({"search":"change"}, document.title, "#!" + Search.params);
        } else {
            window.location = "#!" + Search.params;
        }
        Search.groomParams();
        var fullPath = "http://" + Search.searchHost + "/search/api?" + Search.params;
        // This is super awesome if you like to see the json
        //console.log("full path ", fullPath);
        var jqxhr = $j.ajax(fullPath)
            .done(function(data) {
                Search.setItemVars(data);
                if (!Search.googleAdsLoaded) {
                    Search.initGoogleAds();
                }
                // update tracking and ads
                chow_js.refresh_data();
                if(typeof om != 'undefined'){
                    om.trackSearchView();
                }
            })
            .fail(function() { console.log("There was an error returning results"); });
    },

    endlessScroll: function(){
        $j(window).scroll(function(){
            // don't fetch more results while the drawer is open
            if($j("#viewport").hasClass("showNav") ){
                return;
            }
            //check scroll flag and check to see if we are at the bottom
            if (Search.loadScroll && $j(window).scrollTop()+500 >= ($j(document).height() - ($j(window).height()))){
                Search.loadScroll = false; // set flag so we don't try to load multiple times

                var startAt = parseInt($j("input:hidden[name=start]").val());
                if (startAt+20 > Search.totalResults) {
                    $j("<div id='no_more_results' class='p20 tac f18'>No more results available</div>").appendTo("#results_below_ad");
                    return;
                } else {
                    Search.doingNextPage = true; //changes where the next results will be rendered
                    $j("<div id='board_scroll_spinner'></div>").appendTo("#results_below_ad"); //add spinner
                    $j("html, body").animate({ scrollTop: $j(document).height()-$j(window).height() });
                    //increment the start input value so it will be correct when we serialize
                    $j("input:hidden[name=start]").val( startAt+20 );
                }
                Search.getParams();
            }
        });
    },

    groomParams: function() {
        //square brackets are needed by rails so it know there are multiple params with the same name so it can make those inputs "checked"
        //we must remove them because the actual submitted keys do now have square brackets.
        Search.params = Search.params.replace(/s%5B%5D=/g, "s=");
        Search.params = Search.params.replace(/c%5B%5D=/g, "c=");
        Search.params = Search.params.replace(/t%5B%5D=/g, "t=");

        if (Search.showFeedbackForm) { // we need the query and the category for the inline feedback forms
            Search.queryString = Search.params.match(/q=(.*?)(?:&|$)/)[1];
            // if the capture group below for the c= param is null it throws and error
            Search.catString = Search.params.indexOf("&c=") != -1 ? Search.params.match(/q=(.*?)(?:&|$)/)[1] : "";
        }

        //If it exists "&user_name=some user name" to "&t=tag%3Asome-user-name" so the tag params can be concatenated below.
        if(Search.params.indexOf("&user_name=") != -1) {
            var topicUserName = Search.params.match(/&user_name=(.*?)(?:&|$)/)[1].replace(/\+/g, "-");
            Search.params = Search.params.replace(/&user_name=.*?(?:&|$)/g, "&"); //remove the old user_name param
            Search.params = Search.params + '&t=tag%3A' + topicUserName + '&';
        }

        // check for tags params "t=tag:value" in params if found concatenate into "&t=(tag:value%20OR%20tag:value)"
        //  remove old tags and add new tags to params. You may also use an "AND" with this syntax
        var pattern = /t=tag%3A(.*?)(?:&|$)/g;
        if (Search.params.match(pattern) !== null) { //there are tag:params in param string
            var tagsArr = Search.params.match(pattern);
            tagsParams = "t=(";
            for (var i=0; i<tagsArr.length; i++) {
                var paramValue = tagsArr[i].split("t=tag%3A")[1].split("&")[0];
                if (i != tagsArr.length - 1) {
                    tagsParams += "tag:" + paramValue + "%20OR%20";
                } else {
                    tagsParams += "tag:" + paramValue + ")";
                }
            }
            Search.params = Search.params.replace(/t=tag%3A(.*?)(?:&|$)/g, ""); //remove the serialized "t=" params
            if (Search.params.match(/&$/) == null) Search.params = Search.params + "&"; //need to check this before appending the tags params
            Search.params = Search.params + tagsParams; //add new format "t" params
        }
    },

    setItemVars: function(data) {
        matches = data.matches;
        Search.terms = data.terms;
        Search.category_count = data.match_stats.category_counts;
        Search.totalResults = data.match_stats.total_results;
        $j("#total_results").html("Total results: "+ Search.commaSeparateNumber(Search.totalResults));

        if (data.match_stats.total_results == 0 ) {
            Search.zeroResultsPage();
            return;
        } else {
            if(data.match_stats.category_counts.topics != undefined){
                Search.num_topics =  '<span class="c777 f10"> (' + Search.commaSeparateNumber(data.match_stats.category_counts.topics) + ')</span>';
            }
            if(data.match_stats.category_counts.recipes != undefined){
                Search.num_recipes =  '<span class="c777 f10"> (' + Search.commaSeparateNumber(data.match_stats.category_counts.recipes) + ')</span>';
            }
            if(data.match_stats.category_counts.videos != undefined){
                Search.num_videos =  '<span class="c777 f10"> (' + Search.commaSeparateNumber(data.match_stats.category_counts.videos) + ')</span>';
            }
            if(data.match_stats.category_counts.wp_posts != undefined){
                Search.num_wp_posts =  '<span class="c777 f10"> (' + Search.commaSeparateNumber(data.match_stats.category_counts.wp_posts) + ')</span>';
            }
            if(data.match_stats.category_counts.product_reviews != undefined){
                Search.num_product_reviews =  '<span class="c777 f10"> (' + Search.commaSeparateNumber(data.match_stats.category_counts.product_reviews) + ')</span>';
            }
        }
        $j("#num_topics").html(Search.num_topics);
        $j("#num_recipes").html(Search.num_recipes);
        $j("#num_videos").html(Search.num_videos);
        $j("#num_wp_posts").html(Search.num_wp_posts);
        $j("#num_product_reviews").html(Search.num_product_reviews);

        //set or reset initial state of results variable
        Search.resultHTML = '<ul class="results_list">';

        if (Search.showFeedbackForm) {
            Search.baseIndex = parseInt($j("input:hidden[name=start]").val());
        }

        matchLength = matches.length;
        for (i=0; i<matchLength; i++){

            //set some common variables
            Search.itemMatch = matches[i];
            category = matches[i].attribs.category;
            Search.itemId = matches[i].id.split(":")[1];
            Search.itemTitle = matches[i].attribs.title;
            Search.rankIndex = Search.baseIndex + i;
            Search.itemDate = matches[i].attribs.last_updated;

            //get the image if if exists
            Search.itemImageURL = matches[i].attribs.img;
            var img = Search.itemImageURL;
            if (img != undefined && img != null && img != "" && img != "NULL") {
                Search.itemHasImage = true;
            }


            //call the function by name using the matches[i].category name
            if (typeof Search[category] == 'function') {
                Search[category](matches[i]);
            } else { //this will log any category that does not have a function defined for it.
                console.log("The function being called by name '", matches[i].attribs.category, "' has no function defined for it");
            }

            Search.clearVariables();
        }
        Search.resultHTML += '</ul>';

        if (Search.doingNextPage) {
            $j("#results_below_ad").append(Search.resultHTML);
            $j("#board_scroll_spinner").remove();
            Search.loadScroll = true; // set it back to true so we can scroll and get more
            Search.doingNextPage = false; //changes where the next results will be rendered back to the default
        } else {
            $j("#results_above_ad").html(Search.resultHTML);
        }

    },

    boards: function() {
        Search.itemSection = "Boards";
        var URLprefix = is_prod ? 'http://chowhound.chow.com' : '';
        Search.itemLink = URLprefix+"/boards/"+Search.itemId;
        Search.itemHasDesc = true;
        Search.concatHTML();
    },

    galleries: function() {
        Search.itemSection = "Recipe Gallery";
        Search.itemLink = "/galleries/"+Search.itemId;
        Search.itemHasDesc = true;
        Search.concatHTML();
    },

    product_reviews: function() {
        Search.itemSection = "Product Reviews";
        Search.itemLink = "/reviews/" + Search.itemId + "-" + Search.itemMatch.attribs.slug;
        Search.itemHasDesc = true;
        if (Search.itemMatch.attribs.ratings_average != 0) { //if it has been rated and not rated at 0
            var starWidth = Search.itemMatch.attribs.rating*11;
            Search.itemMeta = '<div class="clearfix recipe_meta"><div class="chow_rating fl mr15">' +
                '<span class="viewport"><span class="stars" style="width:' + starWidth + 'px;">5</span></span>' +
                '</div></div>';
        }
        Search.concatHTML();
    },

    recipes: function() {
        Search.itemSection = Search.itemMatch.attribs.recipe_type_id < 3 ? "Recipe" : "User Recipe";
        Search.itemLink = "/recipes/"+Search.itemId + "-" + Search.itemMatch.attribs.slug;
        Search.itemHasDesc = true;

        //if its not a user recipe
        if (Search.itemMatch.attribs.recipe_type_id < 3) {
            //we need to test for each meta value because recipe data is very inconsistent
            Search.itemMeta = '<div class="clearfix recipe_meta">';
            if (Search.itemMatch.attribs.ratings_average != 0) { //if it has been rate and not rated at 0
                var starWidth = Search.itemMatch.attribs.ratings_average*11;
                Search.itemMeta += '<div class="chow_rating fl mr15">' +
                    '<span class="viewport"><span class="stars" style="width:' + starWidth + 'px;">5</span></span>' +
                    '</div> ';
            }
            if (Search.itemMatch.attribs.difficulty != "" && Search.itemMatch.attribs.difficulty != "NULL") {
                Search.itemMeta += '<div class="fl mr15 c777"> Difficulty:<span class="c333"> ' + Search.itemMatch.attribs.difficulty + '</span></div>';
            }
            if (Search.itemMatch.attribs.total_time != "" && Search.itemMatch.attribs.total_time != "NULL") {
                if (Search.itemMatch.attribs.total_time.length > 35){
                    Search.itemMatch.attribs.total_time = Search.prettyTruncate(Search.itemMatch.attribs.total_time, 30, "...");
                }
                Search.itemMeta += '<div class="fl total_time c777">Total Time:<span class="c333"> ' + Search.itemMatch.attribs.total_time + '</span></div>';
            }
            Search.itemMeta += '</div>';
        }
        Search.concatHTML();
    },

    recipe_categories: function() {
        Search.itemSection = "Recipe Category";
        Search.itemLink = "/recipes/category/"+Search.itemMatch.attribs.slug;
        Search.itemHasDesc = true;
        Search.concatHTML();
    },

    recipe_showcases: function() {
        Search.itemSection = "Holiday Recipes";
        Search.itemLink = "/holiday-recipes/"+Search.itemMatch.attribs.slug;
        Search.itemHasDesc = true;
        Search.concatHTML();
    },

    videos: function() {
        var series = "";
        var series_slug = Search.itemMatch.attribs.series_slug;

        if(Search.itemMatch.attribs.series != "" && Search.itemMatch.attribs.series != undefined && Search.itemMatch.attribs.series != "NULL"){
            series = '<span> - ' + Search.itemMatch.attribs.series + '</span>';
        } else {
            series_slug = 'all'
        }
        Search.itemSection = "Video" + series;
        Search.itemLink = "/videos/show/" + series_slug + "/" +Search.itemId+ "/" + Search.itemMatch.attribs.slug;
        Search.itemHasDesc = true;
        Search.concatHTML();
    },

    topics: function() {
        Search.itemSection = "Discussion";
        var postId = "";
        if (Search.itemMatch.child != undefined) {
            postId = "#"+Search.itemMatch.child.id.split(":")[1];
            Search.itemDesc = Search.prettyTruncate(Search.itemMatch.child.attribs.doc, Search.descriptionLength, "...");
            Search.itemDesc = Search.boldQueryText(Search.itemDesc);
        } else {
            Search.itemDesc = "";// we probably still need a snippet or description for this.
        }
        var replyCount =  Number(Search.itemMatch.attribs.count)-1;
        var URLprefix = is_prod ? 'http://chowhound.chow.com' : '';
        Search.itemLink = URLprefix+"/topics/"+Search.itemId+postId;
        var replyText = replyCount > 1 ? ' Replies' : ' Reply';
        Search.itemTopicsMeta = '<div class="c666 pb5 f11"><span class="board_name"><a href="/boards/' + Search.itemMatch.attribs.board_id + '">' + Search.itemMatch.attribs.board_name +
            '</a>, </span><span class="search_date">' + Search.formatDate(Search.itemDate, "shortpants") + ',</span>' +
            '<span class="topics_replies"> ' + replyCount + replyText +'</span></div>';
        Search.concatHTML();
    },

    wp_posts: function() {
        Search.itemSection = "Article";
        Search.itemLink = "/food-news/"+Search.itemId;
        Search.itemHasDesc = true;

        var theAuthor = "";
        if (Search.itemMatch.attribs.author != " ") {
            theAuthor = '<span class="search_author">By ' + Search.itemMatch.attribs.author + ', </span>';
        }
        Search.itemWp_postsMeta = '<div class="pt5 c666 f11">' + theAuthor  +
            '<span class="search_date">' + Search.formatDate(Search.itemDate, "long") + '</span></div>';
        Search.concatHTML();
    },

    users: function() {
        Search.itemSection = "User";
        Search.itemLink = "/profile/"+Search.itemId;
        Search.concatHTML();
    },

    concatHTML: function() {
        if (Search.itemHasImage) Search.imageAndLinkHTML();
        if (Search.itemHasDesc) Search.getDesc();
        if (Search.showFeedbackForm) Search.feedbackForm();

        Search.resultHTML +=   '<li class="clearfix' + Search.itemImageClass + '">' +
            '<div class="listing_type">' + Search.itemSection + '</div>' +
            '<a href="' + Search.itemLink + '">' +
            '<div class="result_title">' + Search.boldQueryText(Search.itemTitle) + '</div>' +
            '</a>' +
            Search.itemTopicsMeta +
            Search.itemImageHTML +
            '<div class="text_wrapper fl">' +
            Search.itemMeta +
            '<p>' + Search.itemDesc + Search.itemWp_postsMeta +'</p>' +
            '</div>' + Search.itemFeedbackForm +
            '</li>';
    },

    boldQueryText: function(text){
        //splits the text into an array by spaces and then checks the array position to see if the is it has previously been bolded
        // and if not adds a span around it to bold the query terms, this is so things don't get bolded twice.
        textArray = text.split(" ");
        for (var j=0; j<textArray.length; j++) {
            for (var i=0; i<Search.terms.length; i++) {
                if (Search.terms[i].length > 2) { // if the tokenized term is less than two characters don't do anything
                    var pattern = new RegExp(Search.terms[i], "gi");
                    if ( textArray[j].indexOf("<span") == -1 ) {
                        textArray[j] = textArray[j].replace(pattern, function(match) { return "<span class='bold'>"+match+"</span>"; });
                    }
                }
            }
        }
        text = textArray.join(" ");
        return text; //this will get rendered now
    },

    imageAndLinkHTML: function() {
        //some relative image paths don't start with a slash so we remove them all and add it back in below
        Search.itemImageURL = Search.itemImageURL.replace(/http:\/\/www.chow.com\/|^\//, "");
        Search.itemImageURL = "http://search.chow.com/thumbnail/75/50/www.chowstatic.com/" + Search.itemImageURL;

        Search.itemImageHTML = '<a href="'+Search.itemLink+'">' +
            '<img src="' + Search.itemImageURL + '" width="75" height="50" class="fl">' +
            '</a>';
        Search.itemImageClass = " item_has_image";
    },

    getDesc: function() {
        var desc = "";
        if (Search.itemMatch.attribs.category == "wp_posts") {
            desc = Search.itemMatch.attribs.doc.replace(/\[chowvideo.*?\]/gi, ""); //some older wp_post have a video tag that needs to be removed
        } else {
            desc = Search.itemMatch.attribs.description;
        }
        if (desc != undefined && desc != null && desc != "" && desc != "NULL") {
            if (desc.length > Search.descriptionLength) {
                desc = Search.prettyTruncate(desc, Search.descriptionLength, "...")
            }
            Search.itemDesc = Search.boldQueryText(desc);
        } else {
            Search.itemDesc = "";
        }
    },

    formatDate: function(seconds, format) {
        var dateObj = new Date(seconds * 1000);
        if (format == "long") {
            var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
            var dateString = 'published ' + monthNames[dateObj.getUTCMonth()] + ' ' + dateObj.getUTCDate() + ', ' + dateObj.getFullYear();
        } else {
            var dateString = 'Last Updated '  + (dateObj.getUTCMonth()+1) + '/' + dateObj.getUTCDate() + '/' + dateObj.getFullYear().toString().substr(2,2);
        }
        return dateString;
    },

    prettyTruncate: function(string, length, endString) {
        if (string == undefined) {
            return "";//to catch error if something changes.
        }
        var firstSpaceToClip = string.indexOf(" ", length);
        //see if there is a space between the passed in length and end of string if not take the whole string
        var endOfString = firstSpaceToClip != -1 ? firstSpaceToClip : string.length;
        string = string.substring(0, endOfString) + endString;
        return string;
    },

    commaSeparateNumber: function(val){
        while (/(\d+)(\d{3})/.test(val.toString())){
            val = val.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
        }
        return val;
    },

    zeroResultsPage: function() {
        $j("#total_results").html("Total results: 0");
        var zeroResults = '<div id="search_help">' +
            '<span id="type_of_results" class="f12 lh18-lh22">Sorry, we didn\'t find any matches to your search. Please check your spelling, or try again with different search terms.</span>' +
            '<h3 id="zero_result_title" class="pt20 mt5">Basic examples:</h3>' +
            '<p><span>Match a word............................................................</span>artichokes</p>' +
            '<p><span>Match all words.........................................................</span>artichoke hearts</p>' +
            '<p><span>Match an exact phrase...................................................</span>"artichoke hearts"</p>' +
            '<p class="help_footer">Narrow down your results using the filters on the left-hand side of the page. ' +
            'Please report problems or suggestions on the <a href="http://chowhound.chow.com/boards/30">Site Talk</a> board.</p>' +
            '</div>';
        $j("#results_above_ad").html(zeroResults);
    },

    feedbackForm: function() {
        Search.itemFeedbackForm = '<div class="search_feedback"><form action="/search/rate" class="ajaxForm form-inline" method="get"><fieldset>' +
            '<input name="id" type="hidden" value="' + Search.itemSection + ':' + Search.itemId + '">' +
            '<input name="q" type="hidden" value="' + Search.queryString + '">' +
            '<input name="c" type="hidden" value="' + Search.catString + '">' +
            '<input name="rank" type="hidden" value="' + Search.rankIndex + '">' +
            '<label class="radio inline"><input name="rating" type="radio" class="mr5" value="high">Hi</label>' +
            '<label class="radio inline"><input name="rating" type="radio" class="mr5 ml10" value="low">Lo</label>' +
            '<label class="radio inline mr10"><input name="rating" type="radio" class="mr5 ml10" value="irrelevant">Irr</label>' +
            '<label>Notes</label>' +
            '<input name="notes" type="text" placeholder="rank ' + Search.rankIndex + '">' +
            '<input class="feedback_submit" type="submit" value="Rate">' +
            '</fieldset></form></div>';
    },

    initGoogleAds: function(){
        Search.googleAdsLoaded = true;
        try {
            new google.ads.search.Ads(pageOptions, adblock1, adblock2);
        } catch (err) {
            // Log error.
        }
    },

    clearVariables: function(){
        Search.num_recipes = "",
            Search.num_topics = "",
            Search.num_videos = "",
            Search.num_wp_posts = "",
            Search.num_product_reviews = "",

            //section variables
            Search.itemMatch = "",
            Search.itemSection = "",
            Search.itemLink = "",
            Search.itemTitle = "",
            Search.itemDesc = "",
            Search.itemImageURL = "",
            Search.itemImageHTML = "",
            Search.itemImageClass = "",
            Search.itemId = 0,
            Search.itemDate = "",
            Search.itemTopicsMeta = "";
        Search.itemMeta = "";
        Search.itemWp_postsMeta =  "",
            Search.itemHasImage = false,
            Search.itemHasDesc = false,
            Search.itemFeedbackForm = "";
    }
}// end Search


//Google adsense
var adblock1 = {
    'container': 'gafscsa-top',
    'number': '2',
    'lines': '2',
    'verticalSpacing' : 12,

    'attributionText': 'Ads',
    'colorAttribution' : '#777777',
    'fontSizeAttribution' : 10,
    'attributionSpacingBelow' : 6,

    'fontSizeTitle': '18',
    'lineHeightTitle' : 18,
    'colorTitleLink': '#0092C2',
    'noTitleUnderline': true,
    'titleBold' : false,
    'longerHeadlines' : true,

    'fontSizeDescription': '12',
    'lineHeightDescription' : 16,
    'colorText': '#333333',

    'fontSizeDomainLink': '12',
    'lineHeightDomainLink' : 16,
    'colorDomainLink': '#0092c2',

    'colorBackground': '#F4F4F4'
};

var adblock2 = {
    'container': 'gafscsa-middle',
    'number': '3',
    'lines': '2',
    'verticalSpacing' : 12,

    'attributionText': 'Ads',
    'colorAttribution' : '#777777',
    'fontSizeAttribution' : 10,
    'attributionSpacingBelow' : 6,

    'fontSizeTitle': '18',
    'lineHeightTitle' : 18,
    'colorTitleLink': '#0092C2',
    'noTitleUnderline': true,
    'titleBold' : false,
    'longerHeadlines' : true,

    'fontSizeDescription': '12',
    'lineHeightDescription' : 16,
    'colorText': '#777777',

    'fontSizeDomainLink': '12',
    'lineHeightDomainLink' : 16,
    'colorDomainLink': '#0092c2',

    'colorBackground': '#F4F4F4'
};

