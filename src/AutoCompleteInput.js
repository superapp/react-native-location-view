import React from 'react';
import {TextInput, View, StyleSheet, Animated, TouchableOpacity} from "react-native";
import AutoCompleteListView from "./AutoCompleteListView";
import Events from "react-native-simple-events";
import debounce from "../utils/debounce";
import fetch from 'react-native-cancelable-fetch';
import PropTypes from 'prop-types';
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const styles = StyleSheet.create({
  textInputContainer: {
    flexDirection: 'row',
    height: 40,
    zIndex: 99,
    paddingLeft: 10,
    borderRadius: 5,
    backgroundColor: 'white',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowRadius: 2,
    shadowOpacity: 0.24,
    alignItems: 'center'
  },
  textInput: {
    flex: 1,
    fontSize: 17,
    color: '#404752'
  },
  btn: {
    width: 30,
    height: 30,
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center'
  },
  listViewContainer: {
    paddingLeft: 3,
    paddingRight: 3,
    paddingBottom: 3
  }
});

const AUTOCOMPLETE_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json";
const REVRSE_GEO_CODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

export default class AutoCompleteInput extends React.Component {
  static propTypes = {
    apiKey: PropTypes.string.isRequired,
    language: PropTypes.string,
    debounceDuration: PropTypes.number.isRequired
  };

  static defaultProps = {
    language: 'en'
  };

  constructor(props) {
    super(props);
    this._onChangeText = this._onChangeText.bind(this);
    this._request = debounce(this._request.bind(this), this.props.debounceDuration);
    this._abortRequest = this._abortRequest.bind(this);
    this.fetchAddressForLocation = this.fetchAddressForLocation.bind(this);
    this.blur = this.blur.bind(this);
    this._onFocus = this._onFocus.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._getClearButton = this._getClearButton.bind(this);
    this._onPressClear = this._onPressClear.bind(this);
    this.getAddress = this.getAddress.bind(this);
  }

  componentWillUnmount() {
    this._abortRequest();
  }

  state = {
    predictions: [],
    loading: false,
    inFocus: false
  };

  _abortRequest = () => {
    fetch.abort(this);
  };

  fetchAddressForLocation(location) {
    this.setState({loading: true, predictions: []});
    let {latitude, longitude} = location;
    fetch(`${REVRSE_GEO_CODE_URL}?key=${this.props.apiKey}&latlng=${latitude},${longitude}`, null, this)
      .then(res => res.json())
      .then(data => {
        this.setState({loading: false});
        let {results} = data;
        if (results.length > 0) {
          let {formatted_address} = results[0];
          this.setState({text: formatted_address});
        }
      });
  }

  _request(text) {
    this._abortRequest();
    if (text.length >= 3) {
      fetch(`${AUTOCOMPLETE_URL}?input=${encodeURIComponent(text)}&key=${this.props.apiKey}&language=${this.props.language}`, null, this)
        .then(res => res.json())
        .then(data => {
          let {predictions} = data;
          this.setState({predictions});
        });
    } else {
      this.setState({predictions: []});
    }
  }

  _onChangeText(text) {
    this._request(text);
    this.setState({text});
  }

  _onFocus() {
    this._abortRequest();
    this.setState({loading: false, inFocus: true});
    Events.trigger('InputFocus');
  }

  _onBlur() {
    this.setState({inFocus: false});
    Events.trigger('InputBlur');
  }

  blur() {
    this._input.blur();
  }

  _onPressClear() {
    this.setState({text: '', predictions: []});
  }

  _getClearButton() {
    return this.state.inFocus ?
      (<TouchableOpacity style={styles.btn} onPress={this._onPressClear}>
        <MaterialIcons name={'clear'} size={20}/>
      </TouchableOpacity>) : null;
  }

  getAddress() {
    return this.state.loading ? '' : this.state.text;
  }

  render() {
    return (
      <Animated.View style={this.props.style}>
        <View
          style={styles.textInputContainer}
          elevation={5}
        >
          <TextInput
            ref={input => this._input = input}
            value={this.state.loading ? 'Loading...' : this.state.text}
            style={styles.textInput}
            underlineColorAndroid={'transparent'}
            placeholder={'Search'}
            onFocus={this._onFocus}
            onBlur={this._onBlur}
            onChangeText={this._onChangeText}
            outlineProvider='bounds'
            autoCorrect={false}
            spellCheck={false}
          />
          {this._getClearButton()}
        </View>
        <View style={styles.listViewContainer}>
          <AutoCompleteListView
            predictions={this.state.predictions}
          />
        </View>
      </Animated.View>
    );
  }
}