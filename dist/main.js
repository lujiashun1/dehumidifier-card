import {cssData} from './styles.js?v=1.3.0';
import DehumidifierUI from './humidifier_card.lib.js?v=1.3.0';
console.info("%c Dehumidifier Card \n%c  Version  1.3.0 ", "color: orange; font-weight: bold; background: black", "color: white; font-weight: bold; background: dimgray");
class DehumidifierCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  set hass(hass) {
    const config = this._config;
    const entity = hass.states[config.entity];
    if(!entity)return;
    let ambient_humidity = entity.attributes.current_humidity || 0;
    if (config.ambient_humidity && hass.states[config.ambient_humidity])
      ambient_humidity = hass.states[config.ambient_humidity].state;
    let hvac_state = entity.state;
    
    const new_state = {
      entity: entity,
      min_value: entity.attributes.min_humidity,
      max_value: entity.attributes.max_humidity,
      ambient_humidity: ambient_humidity,
      target_humidity: entity.attributes.humidity,
      target_humidity_low: entity.attributes.min_humidity,
      target_humidity_high: entity.attributes.max_humidity,
      hvac_state: entity.state,
      hvac_modes:entity.attributes.available_modes//,
      //preset_mode: entity.attributes.preset_mode,
      //away: (entity.attributes.away_mode == 'on' ? true : false)
    }

    if (!this._saved_state ||
      (this._saved_state.min_value != new_state.min_value ||
        this._saved_state.max_value != new_state.max_value ||
        this._saved_state.ambient_humidity != new_state.ambient_humidity ||
        this._saved_state.target_humidity != new_state.target_humidity ||
        this._saved_state.target_humidity_low != new_state.target_humidity_low ||
        this._saved_state.target_humidity_high != new_state.target_humidity_high ||
        this._saved_state.hvac_state != new_state.hvac_state ||
        //this._saved_state.preset_mode != new_state.preset_mode ||
        //this._saved_state.away != new_state.away)) {
      //this._saved_state = new_state;
      //this.humidifier.updateState(new_state,hass);
     //}
    this._hass = hass;
  }
  
  openProp(entityId) {
    this.fire('hass-more-info', { entityId });
  }
  fire(type, detail, options) {
  
    options = options || {}
    detail = detail === null || detail === undefined ? {} : detail
    const e = new Event(type, {
      bubbles: options.bubbles === undefined ? true : options.bubbles,
      cancelable: Boolean(options.cancelable),
      composed: options.composed === undefined ? true : options.composed,
    })
    
    e.detail = detail
    this.dispatchEvent(e)
    return e
  }
  
  _controlSetPoints() {

    if (this.humidifier.dual) {
      if (this.humidifier.humidity.high != this._saved_state.target_humidity_high ||
        this.humidifier.humidity.low != this._saved_state.target_humidity_low)
        this._hass.callService('humidifier', 'set_humidity', {
          entity_id: this._config.entity,
          target_temp_high: this.humidifier.humidity.high,
          target_temp_low: this.humidifier.humidity.low,
        });
    } else {
      if (this.humidifier.humidity.target != this._saved_state.target_humidity)
        this._hass.callService('humidifier', 'set_humidity', {
          entity_id: this._config.entity,
          humidity: this.humidifier.humidity.target,
        });
    }
  }

  setConfig(config) {
    // Check config
    if (!config.entity && config.entity.split(".")[0] === 'humidifier') {
      throw new Error('Please define an entity');
    }

    // Cleanup DOM
    const root = this.shadowRoot;
    
    if (root.lastChild) root.removeChild(root.lastChild);

    // Prepare config defaults
    const cardConfig = deepClone(config);
    // cardConfig.hvac = Object.assign({}, config.hvac);
    
    if (!cardConfig.diameter) cardConfig.diameter = 400;
    if (!cardConfig.pending) cardConfig.pending = 3;
    if (!cardConfig.idle_zone) cardConfig.idle_zone = 2;
    if (!cardConfig.step) cardConfig.step = 0.5;
    if (!cardConfig.highlight_tap) cardConfig.highlight_tap = false;
    if (!cardConfig.no_card) cardConfig.no_card = false;
    if (!cardConfig.chevron_size) cardConfig.chevron_size = 50;
    if (!cardConfig.num_ticks) cardConfig.num_ticks = 150;
    if (!cardConfig.tick_degrees) cardConfig.tick_degrees = 300;

    // Extra config values generated for simplicity of updates
    cardConfig.radius = cardConfig.diameter / 2;
    cardConfig.ticks_outer_radius = cardConfig.diameter / 30;
    cardConfig.ticks_inner_radius = cardConfig.diameter / 8;
    cardConfig.offset_degrees = 180 - (360 - cardConfig.tick_degrees) / 2;
    cardConfig.control = this._controlSetPoints.bind(this);
    cardConfig.propWin = this.openProp.bind(this);
    this.humidifier = new DehumidifierUI(cardConfig);
    
    if (cardConfig.no_card === true) {
      
      const card = document.createElement('ha-card');
      card.className = "no_card";
      const style = document.createElement('style');
      style.textContent = cssData();
      card.appendChild(style);
      card.appendChild(this.humidifier.container);
      root.appendChild(card);
      
    }
    else {

      const card = document.createElement('ha-card');
      const style = document.createElement('style');
      style.textContent = cssData();
      card.appendChild(style);
      card.appendChild(this.humidifier.container);
      root.appendChild(card);
    }
    this._config = cardConfig;
  }
}
customElements.define('humidifier-card', DehumidifierCard);

function deepClone(value) {
  if (!(!!value && typeof value == 'object')) {
    return value;
  }
  if (Object.prototype.toString.call(value) == '[object Date]') {
    return new Date(value.getTime());
  }
  if (Array.isArray(value)) {
    return value.map(deepClone);
  }
  var result = {};
  Object.keys(value).forEach(
    function(key) { result[key] = deepClone(value[key]); });
  return result;
}