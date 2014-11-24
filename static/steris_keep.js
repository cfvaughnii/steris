      var session = Object;
      var success = false;
      var publisher = Object;
      var subscriber = Object;
      var us_width = "264px";
      var us_height = "198px";
      var them_width = "264px";
      var them_height = "198px";
      var api_key = "";
      var session_id = "";
      var token = "";
      var voiceCallOn = false;

      function initialize_session() {
        AppAPI.getSessionToken().then(function(session_token_arr) {
          console.log("getSessionToken: " + session_token_arr);
          api_key = session_token_arr[0];
          session_id = session_token_arr[1];
          token = session_token_arr[2];
          session = OT.initSession(api_key, session_id);
          do_connect_session();
        });
      };
      /*
          Connect session using api_key, session_id, token
      */       
      function do_connect_session() {

        session.connect(token, function(error) {
          if (error) {
            alert(error);
            console.log(error);
          } else {


            if (session.capabilities.forceDisconnect == 1) {
              console.log(" The client can forceDisconnect. See the next section.");
            } else {
              console.log(" The client cannot moderate.");
            }

            if (session.capabilities.forceUnpublish == 1) {
              console.log(" The client can forceUnpublish.");
            } else {
              console.log("The client cannot moderate.");
            }
            session.on("streamCreated", function(event) {
              console.log("New stream in the session: " + event.stream.streamId);
              var subscriberProperties = {insertMode: "append"};
              subscriber = session.subscribe(event.stream, "OT_them_view", subscriberProperties, function (error) {
              if (error) {
                console.log(error);
              } else {
                var subscribeElement = document.getElementById(subscriber.id);
                subscribeElement.style.top = "0px";
                subscribeElement.style.left = "75px";
                subscribeElement.style.height = them_height;
                subscribeElement.style.width = them_width;
                console.log("Subscriber added.");
                }
              });
            });

            session.on("streamDestroyed", function(event) {
              console.log("streamDestroyed")
            });

            /*
            Send the  information received from 'them' to the GUI element
            */       
            session.on("signal:ringingVideo", function(event) {
              voiceCallOn = false;
              sent_token = $.parseJSON(event.data);
              if (sent_token.token != token) {
                console.log("ringing " + event.data);
              }
            });
            /*
            Send the proximity information received from 'them' to the GUI element
            */       
            session.on("signal:ringingVoice", function(event) {
              voiceCallOn = true;
              sent_token = $.parseJSON(event.data);
              if (sent_token.token != token) {
                console.log("ringing " + event.data);
              }
            });

            session.on("signal:hangupSubscriber", function(event) {
              console.log("hangupSubscriber " + event.data);
              hangupSubscriber();
            });

            session.on("signal:hangupPublisher", function(event) {
              console.log("hangupPublisher " + event.data);
              hangupPublisher();
            });

            session.on("signal:forceHangup", function(event) {
              console.log("forceHangup " + event.data);
              hangupCall();
            });

            session.on("signal:acceptedVideo", function(event) {
              sent_token = $.parseJSON(event.data);
              if (sent_token.token != token) {
                console.log("accepted " + event.data);
                startPublish(true);
              }
            });
            
            session.on("signal:acceptedAudio", function(event) {
              sent_token = $.parseJSON(event.data);
              if (sent_token.token != token) {
                console.log("accepted " + event.data);
                startPublish(false);
              }
            });
          }
       });
      }


      var hideAll = function() {
          $("#OT_us_view").hide();
          $("#OT_them_view").hide();
      }

      var showAll = function() {
          $("#OT_us_view").show();
          $("#OT_them_view").show();
      }
      
      var startPublish = function (video) {
        var targetElement = "OT_us_view";
        publisher = OT.initPublisher(targetElement, null, function(error) {
          if (error) {
            // The client cannot publish.
            // You may want to notify the user.
          } else {
            console.log('Publisher initialized.');
            var pubElement = document.getElementById(publisher.id);
            pubElement.style.top = "250px";
            pubElement.style.left = " 75px";
            pubElement.style.height = us_height;
            pubElement.style.width = us_width;
            session.publish(publisher);
            if (!video) {
              publisher.publishVideo(false);
            }
            else {
            }
          }
        });
      }

      var stopPublish = function() { 
        session.unsubscribe(subscriber);
        session.unpublish(publisher);
      }

      /*
          Function to send a signal to all subscribers
      */       
      function send_message(signal_type, json_string) {
        console.log("send signal " + json_string);
        session.signal(
          {
            data:json_string,
            type:signal_type
          },
          function(error) {
            if (error) {
              console.log("signal error ("
                           + error.code
                           + "): " + error.reason);
            } else {
              console.log("signal sent.");
            }
          }
        );
      }

      var isVoiceCall = function() {
        return voiceCallOn;
      }

      var isVideoCall = function() {
        return !voiceCallOn;
      }

      var videoCall = function(session, publisher, subscriber) { 
        voiceCallOn = false;
        send_message("ringingVideo", JSON.stringify({"token":token}));
      }

      var voiceCall = function() { 
        voiceCallOn = true;
        send_message("ringingVoice", JSON.stringify({"token":token}));
      }
      /*
        The acceptCall function is called
        Do the following:
          1) Turn on Connedted state
          2) Publish our side
          3) Show the OT_us_view
      */
      var acceptCall = function() { 
        do_publish();
        if (voiceCallOn)
          send_message("acceptedAudio",JSON.stringify({"token":token}));
        else
          send_message("acceptedVideo",JSON.stringify({"token":token}));

      }

      var hangupSubscriber = function() { 
        session.unsubscribe(subscriber);
      }

      var hangupPublisher = function() { 
       session.unpublish(publisher);
      }

      var hangupCall = function() { 
        send_message("hangupSubscriber",JSON.stringify({"token":token}));
        send_message("hangupPublisher",JSON.stringify({"token":token}));
      }

      var proximityChange = function() {
        AppAPI.getFaceProximity().then(function(faces) {
          var arrayLength = faces.length;
          for (var i = 0; i < arrayLength; i++) {
            send_message("proximity",JSON.stringify({"face":faces[i][2]}));
            break;
          }
        });
      }

