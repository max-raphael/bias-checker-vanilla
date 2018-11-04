$(function () {
  var url=chrome.tabs.query({'active': true, 'currentWindow': true}, function (tabs) {
    url = tabs[0].url;
    console.log(url);
    return url;
  });
  const myUrl = new URL(url, base=String);
  function processUrl(){
    var myHostname = myUrl.hostname;
    var hostnameKey = myHostname.replace(/\.|$|\[|]|#|\//g, '');
    var myPathname = myUrl.pathname;
    var pathnameKey = myPathname.replace(/\.|$|\[|]|#|\//g, '');
    return (
      {
        articleKey: hostnameKey + pathnameKey,
        hostnameKey
      }
    );
  };

  var currentUserRating = 0;
  // ------------ Start Utility Functions -------------
  function firebaseRef () {
    return window.firebase.database().ref('/articles');
  }

  function bindValuesToHtmlTags() {
    $('#app').show();
    //check if the source is in the database
    if (currentArticleRef() === null){
      $('#source-label').text("This publication doesn't have a bias score yet.");
      // display donkey and elephant
    } else {
      //source is in database- show source bias score
      $('#source-label').text("This publication's bias score is: ");
      currentArticleRef().child(hostBias).once("value").then(function(data){
        $('#host-bias').text(data.val());
      });
      //get value for votes
      currentArticleRef().child(votes).once("value").then(function(data){
        //check if there are votes
        if (data.val() !== 0){
          $('#current-vote-count').text(data.val() + 'votes have been submitted');
          //get current crowdsourced score- dispaly + set color
          currentArticleRef().child(crowdSourceBias).once("value").then(function(crowd_data){
            $('#current-crowdsource-rating').text(getAbsValue(crowd_data.val()));
            $('#article-label').text("This article's crowdsourced bias score is: ");
            $('#current-crowdsource-rating').css("color", getRatingColor(crowd_data.val()));
          });
        } else {  //no votes
          $('#current-crowdsource-rating').text("No Votes Yet");
        }
      });
    }
  }

  function getAbsValue(rating){
    return ((rating >= 0) ? rating : (-1 * rating));
  }

  function currentArticleRef() {
    const currentArticle = processUrl();
    console.log(currentArticle.articleKey);
    firebaseRef().child(currentArticle.articleKey).once("value").then(function(data){
      var articleInDatabase = data.val();
      if (articleInDatabase !== null){
        console.log(articleInDatabase);
        return articleInDatabase;
      } else {
        if (checkForExistingSource(currentArticle.hostnameKey) !== null){
          console.log("source is good, article to be added");
          return addArticle(articleInDatabase, checkForExistingSource(currentArticle.hostnameKey));
        } else {
          console.log("this source isnt good");
          return null;
        }
      }
    });
    // if (firebaseRef().child(currentArticle.articleKey).exists()){
    //   return firebaseRef().child(currentArticle.articleKey);
    // } else {
    //   if (checkForExistingSource(currentArticle.hostnameKey) !== null){
    //     return addArticle(articleKey, checkForExistingSource(currentArticle.hostnameKey));
    //   } else {
    //     return null;
    //   }
    // }
  }

  function checkForExistingSource(hostnameKey){
    var keyToCheck = "sources/" + hostnameKey;
    var ref = firebase.database().ref(keyToCheck);
    ref.once("value").then(function(snapshot) {
      if(snapshot.exists()){
        return snapshot.val();
      } else {
        return null;
      }
    });
  }

  function addArticle(articleKey, hostBiasVal){
    window.firebase.database().ref('articles/' + articleKey).set({
      hostBias: hostBiasVal,
      crowdSourceBias: null,
      votes: 0
    });
    return firebase.database().ref('articles/'+ articleKey);
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
  bindValuesToHtmlTags();
  $('#plus-button').click(addUserRating);
  $('#minus-button').click(subtractUserRating);
  $('#submit-button').click(userSubmitsRating);
  // ------------ Finish Getting to Business -------------
});
