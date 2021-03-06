import React from 'react';
import { connect } from 'react-redux'
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, Icon } from 'react-native-elements'
import { withNavigationFocus } from "react-navigation";
import SelectProjectScreen from './SelectProjectScreen';
import { createStackNavigator } from 'react-navigation';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
let audioRecorderPlayer = new AudioRecorderPlayer();
import store from '../js/store';
import * as Action from '../js/actionTypes';
// Recorder Screen

const EditInspectionStack = createStackNavigator({
  selectProject: SelectProjectScreen
});

class LogoTitle extends React.Component {
  render() {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Text>Inspections</Text>
      </View>
    );
  }
}

class RecorderScreen extends React.Component {

  shouldComponentUpdate(nextProps, nextState) {
    return nextProps.isFocused;
  }
  static navigationOptions = ({ navigation }) => {
    const { params = {} } = navigation.state;
    let readonly = navigation.getParam('readonly', false);

    if (!readonly) {
      return {
        headerTitleStyle: {
          color: 'white'
        },
        headerStyle: {
          backgroundColor: '#003366'
        },
        headerTitle: 'Add Recording',
        headerRight: (
          <Button
            title="Save"
            type="clear"
            onPress={() => params.saveRecording()}
          />
        ),
      }
    } else {
      return {
        headerTitle: 'Recording'
      }
    }
  };

  constructor(props) {
    super(props);
    this.state = {
      params: props.navigation.state.params,
      data: '',
      playState: 'stopped'
    }
  }

  componentDidMount() {
    this.props.navigation.setParams({ saveRecording: this.saveRecording });
    this.props.navigation.setParams({ self: this });
  }

  componentWillUnmount() {
  }

  onStartRecord = async () => {
    const result = await audioRecorderPlayer.startRecorder();
    audioRecorderPlayer.addRecordBackListener((e) => {
      this.setState({
        recordSecs: e.current_position,
        recordTime: audioRecorderPlayer.mmssss(Math.floor(e.current_position)),
        playState: 'recording'
      });
      return;
    });
  }

  onStopRecord = async () => {
    const recording = await audioRecorderPlayer.stopRecorder();
    audioRecorderPlayer.removeRecordBackListener();
    this.setState({
      recordSecs: 0,
      playState: 'stopped',
      rec: recording
    });
  }

  onStartPlay = async () => {
    const msg = await audioRecorderPlayer.startPlayer();
    audioRecorderPlayer.addPlayBackListener((e) => {
      let stateObj = {
        currentPositionSec: e.current_position,
        currentDurationSec: e.duration,
        playTime: audioRecorderPlayer.mmssss(Math.floor(e.current_position)),
        duration: audioRecorderPlayer.mmssss(Math.floor(e.duration)),
        playState: 'playing'
      }
      if (e.current_position === e.duration) {
        audioRecorderPlayer.stopPlayer();
        stateObj.playState = 'stopped';
      }
      this.setState(stateObj);
      return;
    });
  }

  onPausePlay = async () => {
    const msg = await audioRecorderPlayer.pausePlayer();
    this.setState({
      playState: 'paused'
    });
  }

  onStopPlay = async () => {
    audioRecorderPlayer.stopPlayer();
    audioRecorderPlayer.removePlayBackListener();
    this.setState({
      playState: 'stopped'
    });
  }

  saveRecording = async () => {
    let curr = this.props.items;
    let coords = await new Promise(function (r, j) {
      navigator.geolocation.getCurrentPosition(function (loc) {
        r(loc);
      }, function (err) {
        console.log("err:", err);
        r(null);
      });
    });
    // Safety for lat/long
    if (!curr) {
      curr = [];
    }
    if (coords !== null) {
      curr.push({ type: 'voice', uri: this.state.rec, geo: coords.coords, caption: '', timestamp: new Date().toISOString() });
    } else {
      curr.push({ type: 'voice', uri: this.state.rec, geo: [0.0, 0.0], caption: '', timestamp: new Date().toISOString() });
    }
    store.dispatch({ type: Action.UPDATE_ITEMS, items: curr });
    this.props.navigation.navigate('AddCaptionScreen', { back: this.state.params.back });
  }

  render() {
    let readonly = this.props.navigation.getParam('readonly', false);
    let rec = this.state.rec;

    if (readonly) {
      rec = this.props.navigation.getParam('uri', '');
    }

    return (
      <View
        style={{
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        {readonly &&
          <View style={{ margin: 25 }}>
            <Text>Lon: {this.state.params.item.geo.longitude}</Text>
            <Text>Lat: {this.state.params.item.geo.latitude}</Text>
            <Text>Caption: {this.state.params.item.caption}</Text>
          </View>
        }
        <View style={styles.container}>
          {!readonly &&
            <View>
              {
                this.state.playState === 'playing' &&
                <Icon
                  raised
                  disabled
                  name='mic-none'
                  type='material'
                />
              }
              {
                (this.state.playState === 'paused' || this.state.playState === 'stopped') &&
                <Icon
                  raised
                  name='mic-none'
                  type='material'
                  onPress={this.onStartRecord}
                />
              }
              {
                this.state.playState === 'recording' &&
                <Icon
                  raised
                  name='mic'
                  type='material'
                  onPress={this.onStopRecord}
                />
              }
            </View>

          }
          <View>
            {
              (rec === '' || this.state.playState == 'recording') &&
              <Icon
                raised
                disabled
                name='play-circle-outline'
                type='material'
              />
            }
            {
              rec !== '' && (this.state.playState === 'paused' || this.state.playState === 'stopped') &&
              <Icon
                raised
                name='play-circle-outline'
                type='material'
                onPress={this.onStartPlay}
              />
            }
            {
              this.state.playState === 'playing' &&
              <Icon
                raised
                name='pause'
                type='material'
                onPress={this.onPausePlay}
              />
            }
          </View>
          <View>
            {
              (rec === '' || this.state.playState === 'recording') &&
              <Icon
                raised
                disabled
                name='stop'
                type='material'
              />
            }
            {
              rec !== '' && this.state.playState !== 'recording' &&
              <Icon
                raised
                name='stop'
                type='material'
                onPress={this.onStopPlay}
              />
            }
          </View>
        </View>
      </View >
    );
  }
}

function mapStoreStateToProps(storeState) {
  return {
    inspections: storeState.models.inspections,
    currentUser: storeState.auth.currentUser,
    currentInspection: storeState.models.currentInspection,
    items: storeState.models.items,
    requestError: storeState.ui.requests.error,
  };
}
export default connect(mapStoreStateToProps)(withNavigationFocus(RecorderScreen));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    alignContent: 'center'
  }
});
