import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Animated, Platform, UIManager, 
  TouchableOpacity, Text, ViewPropTypes } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Entypo from 'react-native-vector-icons/Entypo';
import axios from 'axios';
import Events from 'react-native-simple-events';
import MapView from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import AutoCompleteInput from './AutoCompleteInput';


const PLACE_DETAIL_URL = 'https://maps.googleapis.com/maps/api/place/details/json';
const DEFAULT_DELTA = { latitudeDelta: 0.015, longitudeDelta: 0.0121 };

export default class LocationView extends React.Component {
  static propTypes = {
    apiKey: PropTypes.string.isRequired,
    initialLocation: PropTypes.shape({
      latitude: PropTypes.number,
      longitude: PropTypes.number,
    }).isRequired,
    markerColor: PropTypes.string,
    actionButtonStyle: ViewPropTypes.style,
    actionTextStyle: Text.propTypes.style,
    actionText: PropTypes.string,
    onLocationSelect: PropTypes.func,
    debounceDuration: PropTypes.number,
    components: PropTypes.arrayOf(PropTypes.string),
    timeout: PropTypes.number,
    maximumAge: PropTypes.number,
    enableHighAccuracy: PropTypes.bool
  };

  static defaultProps = {
    markerColor: 'black',
    actionText: 'DONE',
    onLocationSelect: () => ({}),
    debounceDuration: 300,
    components: [],
    timeout: 15000,
    maximumAge: Infinity,
    enableHighAccuracy: true
  };

  constructor(props) {
    super(props);
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }

  componentDidMount() {
    Events.listen('InputBlur', this.constructor.displayName, this._onTextBlur);
    Events.listen('InputFocus', this.constructor.displayName, this._onTextFocus);
    Events.listen('PlaceSelected', this.constructor.displayName, this._onPlaceSelected);
  }

  componentWillUnmount() {
    Events.rm('InputBlur', this.constructor.displayName);
    Events.rm('InputFocus', this.constructor.displayName);
    Events.rm('PlaceSelected', this.constructor.displayName);
  }

  state = {
    inputScale: new Animated.Value(1),
    inFocus: false,
    region: {
      ...DEFAULT_DELTA,
      ...this.props.initialLocation,
    },
  };

  _animateInput = () => {
    Animated.timing(this.state.inputScale, {
      toValue: this.state.inFocus ? 1.2 : 1,
      duration: 300,
    }).start();
  };

  _onMapRegionChange = region => {
    this._setRegion(region, false);
    if (this.state.inFocus) {
      this._input.blur();
    }
  };

  _onMapRegionChangeComplete = region => {
    this._input.fetchAddressForLocation(region);
  };

  _onTextFocus = () => {
    this.state.inFocus = true;
    this._animateInput();
  };

  _onTextBlur = () => {
    this.state.inFocus = false;
    this._animateInput();
  };

  _setRegion = (region, animate = true) => {
    this.state.region = { ...this.state.region, ...region };
    if (animate) this._map.animateToRegion(this.state.region);
  };

  _onPlaceSelected = placeId => {
    this._input.blur();
    axios.get(`${PLACE_DETAIL_URL}?key=${this.props.apiKey}&placeid=${placeId}`).then(({ data }) => {
      let region = (({ lat, lng }) => ({ latitude: lat, longitude: lng }))(data.result.geometry.location);
      this._setRegion(region);
      this.setState({placeDetails: data.result});
    });
  };

  _getCurrentLocation = () => {
    const { timeout, maximumAge, enableHighAccuracy } = this.props;
    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        this._setRegion({latitude, longitude});
      },
      error => console.log(error.message),
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );
  };

  render() {
    let { inputScale } = this.state;
    return (
      <View style={styles.container}>
        <MapView
          ref={mapView => (this._map = mapView)}
          style={styles.mapView}
          region={this.state.region}
          showsMyLocationButton={true}
          showsUserLocation={false}
          onPress={({ nativeEvent }) => this._setRegion(nativeEvent.coordinate)}
          onRegionChange={this._onMapRegionChange}
          onRegionChangeComplete={this._onMapRegionChangeComplete}
        />
        <Entypo
          name={'location-pin'}
          size={30}
          color={this.props.markerColor}
          style={{ backgroundColor: 'transparent' }}
        />
        <View style={styles.fullWidthContainer}>
          <AutoCompleteInput
            ref={input => (this._input = input)}
            apiKey={this.props.apiKey}
            style={[styles.input, { transform: [{ scale: inputScale }] }]}
            debounceDuration={this.props.debounceDuration}
            components={this.props.components}
          />
        </View>
        <TouchableOpacity
          style={[styles.currentLocBtn, { backgroundColor: this.props.markerColor }]}
          onPress={this._getCurrentLocation}
        >
          <MaterialIcons name={'my-location'} color={'white'} size={25} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, this.props.actionButtonStyle]}
          onPress={() => this.props.onLocationSelect({ ...this.state.region, address: this._input.getAddress(), placeDetails: this.state.placeDetails })}
        >
          <View>
            <Text style={[styles.actionText, this.props.actionTextStyle]}>{this.props.actionText}</Text>
          </View>
        </TouchableOpacity>
        {this.props.children}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapView: {
    ...StyleSheet.absoluteFillObject,
  },
  fullWidthContainer: {
    position: 'absolute',
    width: '100%',
    top: 80,
    alignItems: 'center',
  },
  input: {
    width: '80%',
    padding: 5,
  },
  currentLocBtn: {
    backgroundColor: '#000',
    padding: 5,
    borderRadius: 5,
    position: 'absolute',
    bottom: 70,
    right: 10,
  },
  actionButton: {
    backgroundColor: '#000',
    height: 50,
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  actionText: {
    color: 'white',
    fontSize: 23,
  },
});
