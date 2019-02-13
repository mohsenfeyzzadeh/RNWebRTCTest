/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 * @lint-ignore-every XPLATJSCOPYRIGHT1
 */

import React, {Component} from 'react';
import {StyleSheet, View, Alert, TextInput, Button, Text} from 'react-native';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  mediaDevices
} from 'react-native-webrtc';
import io from 'socket.io-client'

const socket = io('http://192.168.3.160:3000')
socket.on('custom error', error => {
  Alert.alert('error', error)
})

const pc = new RTCPeerConnection()

type Props = {};
export default class App extends Component<Props> {
  constructor(props) {
    super(props)
    this.state = {
      join_disabled: true,
      call_disabled: true,
      room_name: '',
      local_stream_url: '',
      remote_stream_url: ''
    }

    this.join = this.join.bind(this)
    this.call = this.call.bind(this)
    this.handleJoinSuccess = this.handleJoinSuccess.bind(this)
  }

  join() {
    this.setState({join_disabled: true})
    socket.emit('join', {name: this.state.room_name})
    socket.on('join success', this.handleJoinSuccess)
    socket.on('another', () => {
      this.setState({call_disabled: false})
    })
    socket.on('offer', this.handleOffer)
    socket.on('answer', this.handleAnswer)
    socket.on('icecandidate', this.handleIceCandidate)
  }

  async call() {
    try {
      const localSdp = await pc.createOffer()
      await pc.setLocalDescription(localSdp)
      socket.emit('offer', localSdp)
    } catch (error) {
      Alert.alert(error)
    }
  }

  async handleJoinSuccess() {
    try {
      const stream = await mediaDevices.getUserMedia({
        video: {
          mandatory: {
            minWidth: 480,
            minHeight: 270,
            minFrameRate: 25,
            maxWidth: 480,
            maxHeight: 270,
            maxFrameRate: 25
          }
        },
        audio: true
      })
      Alert.alert('info', stream.toURL())
      this.setState({local_stream_url: stream.toURL()})
      pc.addStream(stream)
    } catch (error) {
      Alert.alert('error', error)
    }
    pc.onicecandidate = function(ev) {
      if (ev.candidate) 
        socket.emit('icecandidate', ev.candidate)
    }
    pc.onaddstream = e => {
      const url = e.stream.toURL()
      this.setState({
        remote_stream_url: e.stream.toURL()
      })
    }
  }

  async handleOffer(offer) {
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit('answer', answer)
    } catch (error) {
      Alert.alert('error', error)
    }
  }

  handleAnswer(answer) {
    pc.setRemoteDescription(new RTCSessionDescription(answer))
  }

  handleIceCandidate(candidate) {
    pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(error => {
      Alert.alert('error', error)
    })
  }

  render() {
    return (
      <View style={styles.container}>
        <TextInput onChangeText={text => {text ? this.setState({room_name: text, join_disabled: false}) : ''}} />
        <Button title="join" disabled={this.state.join_disabled} onPress={this.join} />
        <Button title="call" disabled={this.state.call_disabled} onPress={this.call} />
        <View style={styles.videos}>
          <RTCView style={styles.localVideo} streamURL={this.state.local_stream_url} />
          <RTCView style={styles.remoteVideo} streamURL={this.state.remote_stream_url} />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  videos: {
    flexDirection: 'row'
  },
  localVideo: {
    flex: 1,
    height: 150
  },
  remoteVideo: {
    flex: 1,
    height: 150
  }
});
