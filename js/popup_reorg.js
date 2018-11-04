//JQuery function
$( document ).ready(function() {
    console.log("0");
    // ------------START URL FUNCTION -------------
    //add event listener
        console.log("1");
        var globalurl = "";
        getCurrentTabUrl(function(globalurl){
            console.log("2");
            getTabSource(globalurl, function(hostName, pathName){
                console.log("3");
                if (hostName !== null && pathName!== null){
                    console.log("4");
                    pageLoad(hostName, pathName);
                    console.log("5");
                }
            });
        });



    function getCurrentTabUrl(callback){
        var queryInfo = {
            active: true,
            currentWindow: true
        };

        chrome.tabs.query(queryInfo, function(tabs){
            globalurl = tabs[0].url;
            console.log(globalurl);
        });

        callback(globalurl);
    }

    function getTabSource(url,callback){
        var hostName = getHostName(url);
        var path = getPath(url);
        callback(hostName, path);
    }

    var getHostName() {
        try {
          return new URL(globalurl).hostname.match(/(www[0-9]?\.)?(.+)/i)[2];
        } catch (e) {
          return null; // Invalid URL
        }
      }
      
      var getPath = function (url) {
        try {
          return new URL(url).pathname;
        } catch (e) {
          return '/';
        }
      }

    function processUrl(hostName, pathName){
      var hostnameKey = hostName.replace(/\.|$|\[|]|#|\//g, '');
      var pathnameKey = pathName.replace(/\.|$|\[|]|#|\//g, '');
      return (
        {
          articleKey: hostnameKey + pathnameKey,
          hostnameKey
        }
      );
    };
  
    // ------------END URL FUNCTION -------------
    
    function pageLoad(hostName, pathName){
        //get the url
        const currentArticle = processUrl(hostName, pathName);
        //is the source in the database?
        var sourceInDatabase = checkForExistingSource(currentArticle.hostnameKey);
        if (sourceInDatabase){
            //source is in the database. Is the article in the database?
            var articleInDatabase = checkForExistingArticle(currentArticle.articleKey);
            if (!articleInDatabase){
                //article is not in the database.
                var sourceBias = getSourceBias(currentArticle.hostnameKey);
                addArticle(currentArticle.articleKey, sourceBias);
            } //at this point, there is no difference 
            var votes = getVotes(currentArticle.articleKey);
            var crowdSourceScore = getCrowdsourceScore(currentArticle.articleKey);
            var hostBias = getHostBias(currentArticle.articleKey);
            bindExistingArticle(hostBias, votes, crowdSourceScore);
        } else {
           bindNoArticle();
        }
    }
    
     // ------------ Start Utility Functions -------------

    function checkForExistingSource(hostnameKey){
        var keyToCheck = "sources/" + hostnameKey;
        var ref = firebase.database().ref(keyToCheck).once("value").then(function(snapshot){
            return (snapshot.exists()); //bool
        });
    }

    function firebaseRef () {
        return window.firebase.database().ref('/articles');
      }

    function checkForExistingArticle(articleKey){
        firebaseRef().child(articleKey).once("value").then(function(data){
            return (data.exists()); //bool
        });
    }

    function getSourceBias(hostnameKey){
        var keyToCheck = "sources/" + hostnameKey;
        var ref = firebase.database().ref(keyToCheck).once("value").then(function(snapshot){
            return (snapshot.val()); //host bias score, integer
        });
    }

    function addArticle(articleKey, hostBiasVal){
        window.firebase.database().ref('articles/' + articleKey).set({
          hostBias: hostBiasVal,
          crowdSourceBias: 0,
          votes: 0
        });
    }

    function getVotes(articleKey){
        var keyString = articleKey + '/votes';
        firebaseRef().child(keyString).once("value").then(function(data){
            return data.val();
        });
    }

    function getCrowdsourceScore(){
        var keyString = articleKey + '/crowdSourceBias';
        firebaseRef().child(keyString).once("value").then(function(data){
            return data.val();
        });
    }

    function getHostBias(){
        var keyString = articleKey + '/hostBias';
        firebaseRef().child(keyString).once("value").then(function(data){
            return data.val();
        });
    }

    function bindExistingArticle(hostBias, votes, crowdSourceScore){
        $('#app').show();
        $('#source-label').text("This publication's bias score is: ");
        $('#host-bias').text(hostBias);
        $('#current-vote-count').text(votes + 'votes have been submitted');
        $('#article-label').text("This article's crowdsourced bias score is: ");
        $('#current-crowdsource-rating').text(getAbsValue(crowdSourceScore.val()));
        $('#current-crowdsource-rating').css("color", getRatingColor(crowdSourceScore));
    }

    function getAbsValue(rating) {
        return ((rating >= 0) ? rating : (-1 * rating));
    }

    function getRatingColor(rating){
        if (rating < -7){
          return "Navy";
        } else if (rating < -4){
          return "Blue";
        } else if ( rating < 0){
          return "LightSkyBlue";
        } else if (rating == 0) {
          return "Green";
        } else if (rating < 4){
          return "Salmon";
        } else if (rating < 7){
          return "Red";
        } else {
          return "DarkRed";
        }
    }

    function bindNoArticle(){
        $('#app').show();
        $('#source-label').text("This publication doesn't have a bias score yet.");
        //add bottom.hide();
    }
       
  
    function updateRatingOnFirebase(rating) {
      var currentRatingVal = 0;
      var ratingCountVal = 0;
      currentArticleRef().child(crowdSourceBias).once('value').then(function(data){
        currentArticleRef().child(votes).once('value'.then(function(data_count) {
          currentRatingVal = data.val();
          ratingCountVal = data_count.val();
          currentRatingVal.set(calculateNewRating(currentRatingVal,rating,ratingCountVal + 1));
          ratingCountVal.set(ratingCountVal+1);
        }));
      });
    }
  
    function calculateNewRating(currentRating, addedRating, newRatingCount) {
      return ((currentRating * (newRatingCount - 1)) + addedRating)/newRatingCount;
    }
  
    function addUserRating() {
      if (currentUserRating <= 9.5){
        currentUserRating = currentUserRating + 0.5;
      }
    }
  
    function subtractUserRating() {
      if (currentUserRating >= -9.5){
        currentUserRating = currentUserRating - 0.5;
      }
    }
  
    function userSubmitsRating() {
      updateRatingOnFirebase(currentUserRating);
    }
    // ------------ Finish Utility Functions -------------
  
    // ------------ Start Getting to Business -------------
    // currentArticleRef().on('value', bindValueToRating);
    $('#plus-button').click(addUserRating);
    $('#minus-button').click(subtractUserRating);
    $('#submit-button').click(userSubmitsRating);
    // ------------ Finish Getting to Business -------------
});

