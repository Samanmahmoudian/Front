window.Telegram.WebApp.debug = false;

const myTelegramId = getTelegramId()
let myId;
let partnerId;
/**@type {MediaStream} */
let stream;
let isMuted = false;
let isHidden = false;
let camera_view = 'user';
/** @type {RTCPeerConnection} */
let peerConnection;
let iceCandidateQueue = [];
/** @type {HTMLVideoElement} */
const localstream = document.getElementById('localstream');
/** @type {HTMLVideoElement} */
const remotestream = document.getElementById('remotestream');
const muteBtn = document.getElementById('mutebtn');
const switchBtn = document.getElementById('switchbtn');
const nextBtn = document.getElementById('nextbtn');
const startBtn = document.getElementById('startbtn');
let playBtn = document.getElementById("playbutton");


localstream.onplaying = function () {
    const loader = localstream.nextElementSibling;
    if (loader && loader.classList.contains('loader')) {
        loader.style.display = 'none';
    }
};

remotestream.onplaying = function () {
    const loader = remotestream.nextElementSibling;
    if (loader && loader.classList.contains('loader')) {
        loader.style.display = 'none';
    }
};

const peerConnectionConfig = {
    iceServers: [
        {
            urls: "stun:stun.relay.metered.ca:80",
        },
        {
            urls: "turn:global.relay.metered.ca:80",
            username: "a4f5d501c33dfea6e2836653",
            credential: "sxmhLRRVlHNc7aUL",
        },
        {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: "a4f5d501c33dfea6e2836653",
            credential: "sxmhLRRVlHNc7aUL",
        },
        {
            urls: "turn:global.relay.metered.ca:443",
            username: "a4f5d501c33dfea6e2836653",
            credential: "sxmhLRRVlHNc7aUL",
        },
        {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "a4f5d501c33dfea6e2836653",
            credential: "sxmhLRRVlHNc7aUL",
        },
        { urls: "stun:stun.l.google.com:19302" },
        {
            urls: "stun:stun.relay.metered.ca:80",
        },
        {
            urls: "turn:global.relay.metered.ca:80",
            username: "bff881b65e7cda72364ea616",
            credential: "r93lIGVmjDZcQD5Y",
        },
        {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: "bff881b65e7cda72364ea616",
            credential: "r93lIGVmjDZcQD5Y",
        },
        {
            urls: "turn:global.relay.metered.ca:443",
            username: "bff881b65e7cda72364ea616",
            credential: "r93lIGVmjDZcQD5Y",
        },
        {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "bff881b65e7cda72364ea616",
            credential: "r93lIGVmjDZcQD5Y",
        },
    ],
};


 function getTelegramId(){
    window.Telegram.WebApp.ready()
    if (window.Telegram.WebApp.initDataUnsafe) {
        alert(window.Telegram.WebApp.initDataUnsafe.user.id)    
        return String(window.Telegram.WebApp.initDataUnsafe.user.id);
    } else {
        window.close()
    }
}

async function shareMedia(){
    if(stream){
        localstream.pause()
        stream.getTracks().forEach(track => track.stop());
        localstream.srcObject = null
    }
    stream = await navigator.mediaDevices.getUserMedia({
        video: {facingMode: camera_view},
        audio: true
    });
    localstream.srcObject = await stream;
    
    localstream.onended = () => {
        localstream.play();
    };
    
    localstream.onpause = () => {
        localstream.play();
    };
    
}


const socket = io(`https://miniapp-videocall-server.onrender.com` , {query: {userTelegramId: myTelegramId}});

startBtn.addEventListener('click', async () => {
    startBtn.style.display = 'none';
    nextBtn.style.display = 'block';
    muteBtn.style.display = 'block';
    switchBtn.style.display = 'block';
    await shareMedia();
    await socket.emit('startNewCall' , myTelegramId);
});

async function createOffer(){
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    if(!stream){
        await shareMedia()
    }
    stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
    });

    peerConnection.ontrack = async (event) => {
        if(event.streams){
            if (remotestream.played) {
                remotestream.pause();
            }
            console.log(event.streams[0]);
            await new Promise(async (resolve) => {
                remotestream.srcObject = await event.streams[0];
                if (!remotestream.played){
                    await remotestream.play();
                }
                resolve();
            });  
        }
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice' , {to: partnerId , data: event.candidate});
        }
    };
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer' , {to: partnerId , data: offer});
    while (iceCandidateQueue.length) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidateQueue.shift()));
        console.log('new ice candidate added')
    }
}
socket.on('caller' , async(partnerTelegramId)=>{
    partnerId = await partnerTelegramId
    await createOffer()
})

socket.on('callee' , async(partnerTelegramId)=>{
    partnerId = await partnerTelegramId
})

socket.on('offer' , async(offer)=>{
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
            if(!stream){
                await shareMedia()
            }
            stream.getTracks().forEach(track => {
                peerConnection.addTrack(track, stream);
            });

            peerConnection.ontrack = async (event) => {
                if(event.streams){
                    if (remotestream.played) {
                        remotestream.pause();
                    }
                    console.log(event.streams[0]);
                    await new Promise(async (resolve) => {
                        remotestream.srcObject = await event.streams[0];
                        if (!remotestream.played){
                            await remotestream.play();
                        }
                        resolve();
                    });  
                }
            };

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice' , {to: partnerId , data: event.candidate});
                }
            };
            peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('answer' , {to: partnerId , data: answer});
            while (iceCandidateQueue.length) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidateQueue.shift()));
            }
})

socket.on('answer' , async(answer)=>{
    if (peerConnection.signalingState === 'have-remote-offer' || peerConnection.signalingState === 'have-local-pranswer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
})

socket.on('ice' , async(ice)=>{
    if(peerConnection){
        peerConnection.addIceCandidate(new RTCIceCandidate(ice));
        console.log('new ice candidate added')

    }else{
        iceCandidateQueue.push(ice);
    }
})