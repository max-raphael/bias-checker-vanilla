$(function () {

  var currentUserRating = 0;
  // ------------ Start Utility Functions -------------
  function firebaseRef () {
    return window.firebase_database.ref('/articles');
  }

  function bindValueToRating(data) {
    data.
    data = data.val();
    var currentRating = data.crowdSourceBias;
    var votes = data.votes;
    console.log('votes', votes);
    console.log('rating', currentRating);
    const noRatingText = "No Votes Yet"
    var ratingsExist = (votes !== 0);
    
    $('#app').show();
    $('#current-crowdsource-rating').text(ratingsExist ? currentRating : noRatingText);
    if (ratingsExist){
      $('#current-vote-count').text(votes + 'have been submitted');
    }
  }
  // Insert logic to get URL hostname + pathname
  function currentArticleRef() {
    const currentArticleStr = moment().format('YYYY-MM-DD'); // here
    return firebaseRef().child(currentArticleStr);
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
    currentUserRating = currentUserRating + 0.5;
  }

  function subtractUserRating() {
    currentUserRating = currentUserRating - 0.5;
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
