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
      var edge_serial_number = "EDGE-658087";
      var voiceCallOn = false;
      var adobe = false;
      var globalAudioLevel = 0;


      var doAdobe = function(state) {
        var comp = AdobeEdge.getComposition(edge_serial_number);
        var edge_stage = comp.getStage();
        edge_stage.stop(state);
      }

      function initialize_session() {
        $.ajax({url: "/api",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({"jsonrpc": "2.0",
                "method": "getSessionToken", "params": [], "id": "1",
            }),
            dataType: "json",
            success: function(response) {
                alert(response.result[0]);
                var session_token_arr = response.result;
                console.log("getSessionToken: " + session_token_arr);
                api_key = session_token_arr[0];
                session_id = session_token_arr[1];
                token = session_token_arr[2];
                session = OT.initSession(api_key, session_id);
                do_connect_session();
            },
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
                subscriber.setStyle('audioLevelDisplayMode', 'off');
                var movingAvg = null;
                subscriber.on('audioLevelUpdated', function(event) {
                  if (movingAvg === null || movingAvg <= event.audioLevel) {
                    movingAvg = event.audioLevel;
                  } else {
                    movingAvg = 0.7 * movingAvg + 0.3 * event.audioLevel;
                  }
               
                  // Take the log of the movingAvg to 
                  // map the level from -60 - 0 dBm
                  var logLevel = Math.log(movingAvg)*10.0;
                  console.log("logLevel "+logLevel);
                  setTimeout(proximityChange,200);
                  //document.getElementById('subscriberMeter').value = logLevel;
                });
                subscriber.setStyle("nameDisplayMode","off");
                subscriber.setStyle("bugDisplayMode","off");
                subscriber.setStyle("buttonDisplayMode","off");
                subscriber.setStyle("showControlBar","off");
                subscriber.setStyle("showMicButton","off");
                subscriber.setStyle("showSettingsButton","off");

                var subscribeElement = document.getElementById(subscriber.id);
                subscribeElement.style.top = "0px";
                subscribeElement.style.left = "75px";
                subscribeElement.style.height = them_height;
                subscribeElement.style.width = them_width;
                var ot_edge =$("[class*='OT_edge-bar-item']");
                ot_edge.hide();
                console.log("Subscriber added.");
                }
              });
            });

            session.on("streamDestroyed", function(event) {
              //alert("streamDestroyed")
            });

            session.on("streamPropertyChanged", function (event) {
              var subscribers = session.getSubscribersForStream(event.stream);
              for (var i = 0; i < subscribers.length; i++) {
                var s = subscribers[i];
                s.setStyle("nameDisplayMode","off");
                s.setStyle("bugDisplayMode","off");
                s.setStyle("buttonDisplayMode","off");
                s.setStyle("showControlBar","off");
                s.setStyle("showMicButton","off");
                s.setStyle("showSettingsButton","off");
                console.log(s.guid + " " + event.changedProperty +  " hasVideo changed ");
              }
            });
            /*
            proximity information received from 'them'
            */       
            session.on("signal:proximity", function(event) {
             console.log("proximity " + event.data);
             //The GUI call goes here
            });
            /*
            Send the proximity information received from 'them' to the GUI element
            */       
            session.on("signal:ringingVideo", function(event) {
              voiceCallOn = false;
              sent_token = $.parseJSON(event.data);
              if (sent_token.token != token) {
                if (adobe)
                  doAdobe("Ringing");
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
                if (adobe)
                  doAdobe("Ringing");
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
                if (adobe)
                  doAdobe("Connected");
              }
            });
            
            session.on("signal:acceptedAudio", function(event) {
              sent_token = $.parseJSON(event.data);
              if (sent_token.token != token) {
                console.log("accepted " + event.data);
                startPublish(false);
                if (adobe)
                  doAdobe("Connected");
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
            publisher.setStyle("nameDisplayMode","off");
            publisher.setStyle("bugDisplayMode","off");
            publisher.setStyle("buttonDisplayMode","off");
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
        if (adobe)
          doAdobe("Connecting");
        send_message("ringingVideo", JSON.stringify({"token":token}));
      }

      var voiceCall = function() { 
        voiceCallOn = true;
        if (adobe)
          doAdobe("Connecting");
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
        if (adobe)
          doAdobe("Connected");
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
        if (adobe)
          doAdobe("Near");
      }


