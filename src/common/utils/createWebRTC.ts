import { RTCPeerConnection } from '@roamhq/wrtc';

export async function createSDPOffer() {
  const peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });

  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return peerConnection?.localDescription?.sdp || '';
  } catch (error: any) {
    throw new Error('Error creating SDP offer: ' + error?.message || 'Unknown error');
  }
}
