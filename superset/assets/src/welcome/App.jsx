/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import { hot } from 'react-hot-loader';
import thunk from 'redux-thunk';
import { createStore, applyMiddleware, compose, combineReducers } from 'redux';
import { Provider } from 'react-redux';

import { initFeatureFlags } from 'src/featureFlags';
import messageToastReducer from '../messageToasts/reducers';
import { initEnhancer } from '../reduxUtils';
import setupApp from '../setup/setupApp';
import Welcome from './Welcome';

setupApp();

const container = document.getElementById('app');
const bootstrap = JSON.parse(container.getAttribute('data-bootstrap'));
initFeatureFlags(bootstrap.common.feature_flags);
const user = { ...bootstrap.user };

const store = createStore(
  combineReducers({
    messageToasts: messageToastReducer,
  }),
  {},
  compose(
    applyMiddleware(thunk),
    initEnhancer(false),
  ),
);

const App = () => (
  <Provider store={store}>
    <Welcome user={user} />
  </Provider>
);

export default hot(module)(App);
