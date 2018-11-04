const config = {
  apiKey: "AIzaSyARisDaUpCv3QpAlve0arKpU69d1a0SSy4",
  databaseURL: "https://bias-checker.firebaseio.com/",
};

window.firebase.initializeApp(config);
window.firebase_database = firebase.database();

console.log("loaded firebase")

firebase.database().ref('/articles/').once('value').then(function(snapshot) {
  var username = (snapshot.val());
  console.log(username);
});


