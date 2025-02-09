

const localstream = document.getElementById('localstream');
const remotestream = document.getElementById('remotestream');
const mutebtn = document.getElementById('mutebtn');
const hidebtn = document.getElementById('hidebtn');
const endbtn = document.getElementById('endbtn');
const switchbtn = document.getElementById('switchbtn')
let isMuted = false;
let isHidden = false;
let camera_view = 'user'

const socket = io('https://miniapp-videocall-server.onrender.com');

var peerConnection = new RTCPeerConnection({
    iceServers: [
        {
            url: 'stun:global.stun.twilio.com:3478',
            urls: 'stun:global.stun.twilio.com:3478'
          },
          {
            url: 'turn:global.turn.twilio.com:3478?transport=udp',
            username: '831a2f384d43a34121a9c61d4a88371144523a35887d01dc1d5adacc34ef1e7a',
            urls: 'turn:global.turn.twilio.com:3478?transport=udp',
            credential: 'y1pgmln8x7nYMcOZZNsU6TYdY1uQwG8aIc6PgiCq8BE='
          },
          {
            url: 'turn:global.turn.twilio.com:3478?transport=tcp',
            username: '831a2f384d43a34121a9c61d4a88371144523a35887d01dc1d5adacc34ef1e7a',
            urls: 'turn:global.turn.twilio.com:3478?transport=tcp',
            credential: 'y1pgmln8x7nYMcOZZNsU6TYdY1uQwG8aIc6PgiCq8BE='
          },
          {
            url: 'turn:global.turn.twilio.com:443?transport=tcp',
            username: '831a2f384d43a34121a9c61d4a88371144523a35887d01dc1d5adacc34ef1e7a',
            urls: 'turn:global.turn.twilio.com:443?transport=tcp',
            credential: 'y1pgmln8x7nYMcOZZNsU6TYdY1uQwG8aIc6PgiCq8BE='
          },
        {
          urls: "stun:stun.relay.metered.ca:80",
        },
        {
            urls: "stun:stun.l.google.com:19302",
          },
          {
            urls: "stun:global.stun.twilio.com:3478",
          },
        {
          urls: "turn:global.relay.metered.ca:80",
          username: "668aa7edae8119ac57b8985d",
          credential: "MRvEutvpeLKLHuQA",
        },
        {
          urls: "turn:global.relay.metered.ca:80?transport=tcp",
          username: "668aa7edae8119ac57b8985d",
          credential: "MRvEutvpeLKLHuQA",
        },
        {
          urls: "turn:global.relay.metered.ca:443",
          username: "668aa7edae8119ac57b8985d",
          credential: "MRvEutvpeLKLHuQA",
        },
        {
          urls: "turns:global.relay.metered.ca:443?transport=tcp",
          username: "668aa7edae8119ac57b8985d",
          credential: "MRvEutvpeLKLHuQA",
        },
    ],
  });


  
peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
        try {
            socket.emit('ice', event.candidate);
        } catch (error) {
            socket.emit('error' , error)
            console.error('Error sending ICE candidate:', error);
        }
    }
};

socket.on('ice', async (ice) => {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(ice));
    } catch (error) {
        socket.emit('error' , error)
        console.error('Error adding ICE candidate:', error);
    }
});

peerConnection.oniceconnectionstatechange = () => {
    switch (peerConnection.iceConnectionState) {
        case 'failed':
        case 'disconnected':
        case 'closed':
            console.error('Peer connection failed or disconnected.');
            break;
        case 'connected':
            console.log('Peer connection established.');
            break;
        default:
            break;
    }
};


  async function sendOffer() {
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer);
    } catch (error) {
        socket.emit('error' , error)
        console.error('Error sending offer:', error);
    }
}

socket.on('offer', async (offer) => {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', answer);
    } catch (error) {
        socket.emit('error' , error)
        console.error('Error handling offer:', error);
    }
});

socket.on('answer', async (answer) => {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("Connected successfully");
    } catch (error) {
        socket.emit('error' , error)
        console.error('Error handling answer:', error);
    }
});



peerConnection.onconnectionstatechange = () => {
    if (peerConnection.connectionState === 'failed') {
        socket.emit('error' , 'connection failed')
        console.error('Connection failed.');
    }
};

peerConnection.onnegotiationneeded = sendOffer;




navigator.mediaDevices.getUserMedia({ video:{facingMode:camera_view}, audio: true }).then((stream) => {
    stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
    });
    localstream.srcObject = stream;
    localstream.onplaying = function () {
        const loader = localstream.nextElementSibling;
        if (loader && loader.classList.contains('loader')) {
            loader.style.display = 'none';
        }
    };
}).catch((error) => {
    socket.emit('error' , error)
    console.error('Error accessing media devices:', error);
    alert('Could not access media devices. Please ensure permissions are granted.');
});





peerConnection.ontrack = async (event) => {
    try {
        remotestream.srcObject = event.streams[0];
        remotestream.onplaying = function () {
            const loader = remotestream.nextElementSibling;
            if (loader && loader.classList.contains('loader')) {
                loader.style.display = 'none';
            }
        };
    } catch (error) {
        socket.emit('error' , error)
        console.error('Error handling track event:', error);
    }
};




switchbtn.addEventListener('click' , ()=>{
    camera_view = 'user' ? 'environment' : 'user'
    peerConnection.getSenders().forEach(sender=>{
        if(sender.track.kind === 'video'){
            navigator.mediaDevices.getUserMedia({video:camera_view}).then(stream=>{
                sender.replaceTrack(stream.getVideoTracks()[0])
                localstream.srcObject = stream
            }).catch(err=>{
                alert(err)
            })
        }

    })
})


endbtn.addEventListener('click', () => {
    peerConnection.close();  
    localstream.srcObject.getTracks().forEach(track => track.stop()); 
    socket.emit('endcall' , 'end') 
    alert('Call ended.');
    window.close()
});
socket.on('endcall' , async(endcall)=>{
  if(endcall == 'end'){
    alert('The other user ended the call...');
    window.close()
  }
})



mutebtn.addEventListener('click', () => {
    isMuted = !isMuted;
    localstream.srcObject.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;  
    });
    mutebtn.textContent = isMuted ? 'Unmute' : 'Mute';  
});



hidebtn.addEventListener('click', () => {
    isHidden = !isHidden;
    localstream.srcObject.getVideoTracks().forEach(track => {
        track.enabled = !isHidden;  
    });
    hidebtn.textContent = isHidden ? 'Show Video' : 'Hide Video';  
});



