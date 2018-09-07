//Imports start
const sleep = require('sleep');
const Twitter = require('twitter');
const fs = require('fs');
//Imports end

//Constants start
const monthArray = ['Jan','Feb','Mar','Apr','May','June','July','Aug','Sep','Oct','Nov','Dec'];
//var searchEndpoint = "https://api.twitter.com/1.1/search/tweets.json";
var bearerToken = "Bearer AAAAAAAAAAAAAAAAAAAAAPaR8QAAAAAAfnyADdVVFsTnS349UfLAucU55Pw%3DJ0lYBaMnr7wigxeYpQGc0RGWj4qxoQlO0rEprCQRGgSHuS38No";

var queryLimit = 45; //real value -> 45
var windowLimit = 450; //real value -> 450
var sleepTimeInMinutes = 20;
var sleepTimeInSeconds = sleepTimeInMinutes*60; //real value -> 15*60
var currentQueryCount = 0;
var topics = ["Environment","Crime","Politics","Social Unrest","Infrastructure"];
//topic keywords should be specific to city, work on it

var cityVsGeoLocation = {
    "New York City (NYC)":"40.730610,-73.935242,250mi",
    "Delhi":"28.64386,77.12373,250mi",
    "Bangkok":"13.736717,100.523186,250mi",
    "Paris":"48.864716,2.349014,35mi",
    "Mexico City":"19.432608,-99.133209,250mi"
};

var languageVsCode = {
    "English":"en",
    "Hindi":"hi",
    "Spanish":"es",
    "French":"fr",
    "Thai":"th"
};
var statsFile = "../output_files/stats.json";
var stats;
stats = fs.readFileSync(statsFile,"utf8");
console.log("stats is::"+stats);
if(stats){
  stats = JSON.parse(stats);
}
else{
  stats = {
    "English":0,
    "Hindi":0,
    "Spanish":0,
    "French":0,
    "Thai":0,
    "Environment":0,
    "Crime":0,
    "Politics":0,
    "Social Unrest":0,
    "Infrastructure":0,
    "New York City (NYC)":0,
    "Delhi":0,
    "Bangkok":0,
    "Paris":0,
    "Mexico City":0,
    "Total":0
  }
}


var cityVstopicsVsKeywords = {

      "New York City (NYC)-Environment":"traffic OR climate OR ecosystem OR flood OR Blizzard OR earthquake OR hurricane OR Pollution OR temperature -RT",
      "New York City (NYC)-Crime":"corruption OR Crime OR Rape OR Murder OR Criminal OR Robbery OR Assault OR gun OR Theft -RT",
      "New York City (NYC)-Politics":"party OR campaign OR unemployment OR corruption OR Adminstration OR Constitution OR Trump OR China OR Federal or Republican OR Democratic -RT",
      "New York City (NYC)-Social Unrest":"order OR unemployment OR rebellion OR left-wing OR riots OR protests OR strikes -RT",
      "New York City (NYC)-Infrastructure":"economy OR Roads OR traffic OR electricity OR sanitation OR water OR power -RT",
      "Delhi-Environment":"traffic OR climate OR flood OR Blizzard OR Pollution OR temperature -RT",
      "Delhi-Crime":"corruption OR Crime OR Rape OR Murder OR Criminal OR Robbery OR Assault OR gun OR Theft -RT",
      "Delhi-Politics":"union OR politics OR AAP OR law OR agenda OR corruption OR Modi OR Rahul OR Party OR China -RT",
      "Delhi-Social Unrest":"order OR rebellion OR left-wing OR riots OR protests OR strikes -RT",
      "Delhi-Infrastructure":"economy OR Roads OR traffic OR electricity OR sanitation OR water OR power -RT",
      "Bangkok-Environment":"traffic OR flood OR Blizzard OR earthquake OR hurricane OR Pollution OR temperature -RT",
      "Bangkok-Crime":"unemployment OR corruption OR Crime OR Rape OR Murder OR Criminal OR Robbery OR Assault OR gun OR Theft -RT",
      "Bangkok-Politics":"King OR monarchy OR election OR prime minister OR order OR politicians OR ban OR corruption OR Trump OR China -RT",
      "Bangkok-Social Unrest":"military OR peace OR order OR rebellion OR left-wing OR riots OR protests OR strikes -RT",
      "Bangkok-Infrastructure":"economy OR Roads OR traffic OR electricity OR sanitation OR water OR power -RT",
      "Paris-Environment":"traffic OR ecosystem OR flood OR Blizzard OR earthquake OR hurricane OR Pollution OR temperature -RT",
      "Paris-Crime":"corruption OR Crime OR Rape OR Murder OR Criminal OR Robbery OR Assault OR gun OR Theft -RT",
      "Paris-Politics":"party OR politician OR Climate OR corruption OR Adminstration OR law OR Macron OR president OR euro OR campaign -RT",
      "Paris-Social Unrest":"military OR order OR rebellion OR left-wing OR riots OR protests OR strikes -RT",
      "Paris-Infrastructure":"economy OR Roads OR traffic OR electricity OR sanitation OR water OR power -RT",
      "Mexico City-Environment":"traffic OR climate OR flood OR Blizzard OR earthquake OR hurricane OR Pollution OR temperature -RT",
      "Mexico City-Crime":"unemployment OR corruption OR Crime OR Rape OR Murder OR Criminal OR Robbery OR Assault OR gun OR Theft -RT",
      "Mexico City-Politics":"reform OR party OR politician OR campaign OR corruption OR left-wing OR congress OR Trump OR Andres Manuel OR Republican -RT",
      "Mexico City-Social Unrest":"military OR peace OR rebellion OR left-wing OR riots OR protests OR strikes -RT",
      "Mexico City-Infrastructure":"economy OR Roads OR traffic OR electricity OR sanitation OR water OR power -RT"
};
var combinations = [
    {
      "city":"New York City (NYC)",
      "languages":["English"]
    },
    {
      "city":"Delhi",
      "languages":["English","Hindi"]
    },
    {
      "city":"Bangkok",
      "languages":["English","Thai"]
    },
    {
      "city":"Paris",
      "languages":["English","French"]
    },
    {
      "city":"Mexico City",
      "languages":["English","Spanish"]
    }
];

var twClient = new Twitter({
    consumer_key:"MSX61MJcG6T0YkiQbcdOUJ5p6",
    consumer_secret:"pzbfIQAtC9Er6bpMcDq49JrCZKaJMvT4Y9UqpegZZIRcnuphGj",
    bearer_token:"AAAAAAAAAAAAAAAAAAAAAPaR8QAAAAAAfnyADdVVFsTnS349UfLAucU55Pw%3DJ0lYBaMnr7wigxeYpQGc0RGWj4qxoQlO0rEprCQRGgSHuS38No"
});

function getDateString(date){
  return `${monthArray[date.getMonth()]}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}-${date.getMilliseconds()}`;
}
//Constants end

//Logic begins
function init(){

    for (var combIdx in combinations){

      var combination = combinations[combIdx];
      var city = combination.city;
      var languages = combination.languages;
      for (var langIdx in languages){
        var language = languages[langIdx];
        for (var topicIdx in topics){
          var topic = topics[topicIdx];
          collectTweets(city, language, topic);
        }
      }
    }
}

function log(logStr){
  var date = new Date();
  logStr = getDateString(date)+"::::"+logStr;
  var logFileName = "../log_files/log_"+(date.getMonth()+1)+"_"+(date.getDate())+".txt";
  console.log()
  fs.open(logFileName, 'a',function(err){
    if(err){console.log("Error occured while opening log file")}
    fs.appendFile(logFileName,'\r\n'+JSON.stringify(logStr), function(err){
         if(err){console.log("Error occured while writing logs")}
    });
  });
}

function collectTweets(city, language, topic){

      var geoLocation = cityVsGeoLocation[city];
      var langCode = languageVsCode[language];
      var keyWords = cityVstopicsVsKeywords[city+"-"+topic];
      fs.appendFileSync("../output_files/last_run.txt","last run at::"+new Date()+'\r\n');
      twClient.get('search/tweets', {q: keyWords,count: queryLimit, lang: langCode , geocode:geoLocation}, function(error, tweets, response) {
         log(`Current query count is ${currentQueryCount}`);
         log(`Fetching ${queryLimit} tweets for the combo ${city}::${language}::${topic}::${keyWords}`);

         if(!tweets || !tweets.statuses)
           return;
         var tweetsCount = tweets.statuses.length;
         log(`Tweets fetched ${tweetsCount}`);

         var uniqueTweetsCount = 0;
         var date = new Date();
         var tweetIds="";
         var tweetIdsFile = "../log_files/tweet_ids_"+(date.getMonth()+1)+"_"+(date.getDate())+".json";
         if(fs.existsSync(tweetIdsFile)){
           tweetIdsAlreadyExisting = fs.readFileSync(tweetIdsFile,"utf8");
           if(!tweetIdsAlreadyExisting){
              tweetIds = tweetIdsAlreadyExisting;
           }
         }
         var date = new Date();
         var month = monthArray[date.getMonth()];
         var outObj = [];
         var fileName = `${city}_${topic}_${langCode}_${month}_${date.getDate()}_${date.getHours()}_${date.getMinutes()}_${date.getSeconds()}_${date.getMilliseconds()}.json`;
         tweets.statuses.forEach(function(tweet) {
           var tweetId = tweet.id;
           if(tweetIds.indexOf(tweetId) == -1){
             tweet.city = city;
             tweet.topic = topic;
             delete tweet.favorite_count; delete tweet.favorited; delete tweet.retweet_count; delete tweet.retweeted_status;
             delete tweet.source; delete tweet.user;
             outObj.push(tweet);
             tweetIds = tweetIds+tweetId.toString()+",";
             uniqueTweetsCount++;
             console.log(`tweet text:${tweet.text}, tweet lang:${tweet.lang}, tweet city:${tweet.city}`);
           }
           else{
             log("Tweet with ID::"+tweetId+"::exists already");
           }
         });

         fs.writeFile("../output_files/raw_tweets/"+fileName,JSON.stringify(outObj), function(err){
              if(err){
                console.log("Error occured while writing the tweet");
              }
         });
         log(`Parsed ${uniqueTweetsCount} unique tweets`);
         fs.appendFileSync(tweetIdsFile, tweetIds);
         //Collect stats
         stats[city] = stats[city] + tweetsCount;
         stats[topic] = stats[topic] + tweetsCount;
         stats[language] = stats[language] + tweetsCount;
         stats["Total"] = stats["Total"]==null?0:stats["Total"] + tweetsCount;
         fs.writeFileSync(statsFile,'\r\n'+JSON.stringify(stats));

         currentQueryCount+=queryLimit; //should add only tweetcount
         if(currentQueryCount + queryLimit > windowLimit){
           log("Query limit exhausted, Starting to sleep at::"+new Date().getMinutes());
           var date = new Date();
           var minutesAfterAddingDelay = date.getMinutes()+sleepTimeInMinutes;
           if(minutesAfterAddingDelay>60){
            	var minutesPart = (minutesAfterAddingDelay % 60);
            	date.setHours(date.getHours()+1);
            	date.setMinutes(minutesPart);
            }
            else{
            	date.setMinutes(minutesAfterAddingDelay);
            }
           fs.appendFileSync("../output_files/last_run.txt","next run at::"+date+'\r\n');
           sleep.sleep(sleepTimeInSeconds);
           log("Waking after sleep at::"+new Date().getMinutes());
           currentQueryCount = 0;
           init();
         }
      });
}

init();
//Logic ends
