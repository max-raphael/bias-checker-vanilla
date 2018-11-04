//JQuery function
$(function () {

    console.log('function running');
    getCurrentTabUrl(function(url){
        getTabSource(url, function(hostName, pathName){
            console.log('back to main');
            if (hostName !== null && pathName!== null){
                console.log('not null');
                pageLoad(hostName, pathName); 
            }
        });
    });

    async function getCurrentTabUrl(callback){
        console.log("getCurrentTabUrl entered:");
        var queryInfo = {
            active: true,
            currentWindow: true
        };
        await chrome.tabs.query(queryInfo, function(tabs){
            var tab = tabs[0];
            var url = tabs[0].url;
            console.log("url", url);
            callback(url);
        });

    }

    function getTabSource(url,callback){
        console.log("getTabSource entered:");
        var hostName = getHostName(url);
        var path = getPath(url);
        console.log("hostname:", hostName);
        console.log("pathname", path);
        return callback(hostName, path);
    }

    var getHostName = function (url) {
        console.log("getHostName entered:");
        try {
          return new URL(url).hostname.match(/(www[0-9]?\.)?(.+)/i)[2];
        } catch (e) {
          return null; // Invalid URL
        }
      }
      
      var getPath = function (url) {
        console.log("getPath entered:");
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
    
    async function pageLoad(hostName, pathName){
        //get the url
        const currentArticle = processUrl(hostName, pathName);
        console.log("article key: ", currentArticle.articleKey);
        console.log("hostnameKey: ", currentArticle.hostnameKey);
        //is the source in the database?
        var sourceInDatabase = await checkForExistingSource(currentArticle.hostnameKey);
        console.log("sourceInDatabase:", sourceInDatabase);
        if (sourceInDatabase){
            console.log("sourced detected");
            //source is in the database. Is the article in the database?
            var articleInDatabase = await checkForExistingArticle(currentArticle.articleKey);
            console.log("article in database", articleInDatabase);
            if (!articleInDatabase){
                //article is not in the database.
                var sourceBias = await getSourceBias(currentArticle.hostnameKey);
                await addArticle(currentArticle.articleKey, sourceBias);
            } //at this point, there is no difference 
            var votes = await getVotes(currentArticle.articleKey);
            console.log("votes",votes);
            var crowdSourceScore = await getCrowdsourceScore(currentArticle.articleKey);
            console.log("crowdSourceScore",crowdSourceScore);
            var hostBias = await getSourceBias(currentArticle.hostnameKey);
            console.log("hostBias",hostBias);
            bindExistingArticle(hostBias, votes, crowdSourceScore);
        } else {
           bindNoArticle();
        }
    }
    
     // ------------ Start Utility Functions -------------

    async function checkForExistingSource(hostnameKey){
        console.log('entered, check for existing source');
        var keyToCheck = "/sources/" + hostnameKey;
        var exists = false;
        var ref = await firebase.database().ref(keyToCheck).once("value").then(function(snapshot){
            console.log("snapshot val", snapshot.val());
            exists = (snapshot.val() !== null);
        });
        return exists; //bool
    }

    function firebaseRef () {
        return window.firebase.database().ref('/articles');
      }

    async function checkForExistingArticle(articleKey){
        console.log('entered, check for existing article');
        var keyToCheck = "/articles/" + articleKey;
        console.log("articlekey:", articleKey);
        var exists = false;
        var ref = await firebase.database().ref(keyToCheck).once("value").then(function(snapshot){
            console.log("snapshot val", snapshot.val());
            exists = (snapshot.val() !== null);
        });
        return exists; //bool
    }

    async function getSourceBias(hostnameKey){
        console.log('entered get source bias');
        var keyToCheck = "/sources/" + hostnameKey;
        var hostBias = 0;
        var ref = await firebase.database().ref(keyToCheck).once("value").then(function(snapshot){
            hostBias = snapshot.val();
        });
        return hostBias;

    }

    function addArticle(articleKey, hostBiasVal){
        window.firebase.database().ref('articles/' + articleKey).set({
          hostBias: hostBiasVal,
          crowdSourceBias: 0,
          votes: 0
        });
    }

    async function getVotes(articleKey){
        var keyToCheck = "/articles/" + articleKey;
        var votes = 0;
        var ref = await firebase.database().ref(keyToCheck).once("value").then(function(snapshot){
            votes = snapshot.val().votes;
        });
        return votes;
    }

    async function getCrowdsourceScore(articleKey){
        var keyToCheck = "/articles/" + articleKey;
        var crowdSourceScore = 0;
        var ref = await firebase.database().ref(keyToCheck).once("value").then(function(snapshot){
            crowdSourceScore = snapshot.val().crowdSourceBias;
        });
        return crowdSourceScore; 
    }

    function bindExistingArticle(hostBias, votes, crowdSourceScore){
        $('#app').show();
        $('#source-label').text("This publication's bias score is: ");
        $('#host-bias').text(hostBias);
        $('#current-vote-count').text(votes + 'votes have been submitted');
        $('#divider1').show();
        $('#article-label').text("This article's crowdsourced bias score is: ");
        $('#current-crowdsource-rating').text(getAbsValue(crowdSourceScore.val()));
        $('#current-crowdsource-rating').css("color", getRatingColor(crowdSourceScore));
        $('#add-input').text("What do you think?");
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
        $('#submit-button').hide();
        $('#plus-button').hide();
        $('#minus-button').hide();
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
  