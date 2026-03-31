import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import './src/services/BackgroundService'; // Explicit registration for Headless JS

AppRegistry.registerComponent('the-flip-escape', () => App);
