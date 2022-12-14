import Alert from '../main/alert.js';
import moment from '../min/moment.min.js';
/* import moment from 'https://cdn.jsdelivr.net/npm/moment@2.29.4/dist/moment.min.js'; */
import DEFAULT_DICT, { BASIC_DICT, EXTENDED_DICT } from '../utils/chars.js';
import {
  BACKSLASH,
  CHANGE,
  CLICK,
  CUSTOM_OPTION,
  DANGER,
  DATE_FORMAT,
  DOUBLE_QUOTE,
  ENTER_KEY,
  JSON_FILENAME_TEMPLATE,
  KEY_DOWN,
  KEY_UP,
  MAX_LOOPS,
  MIN_LOOPS,
  SEPARATOR,
} from '../utils/constant.js';
import copyToClipboard from '../utils/copyclipboard.js';
import { setEnableComponents, setVisibleComponents } from '../utils/utils.js';

let editor;

const setResult = (resultNoLinebreak, result) => {
  $('#dictbuilder-result-id').text(resultNoLinebreak);
  $('#dictbuilder-textarea-result-id').val(result);
};

const shuffle = (list) => {
  const loops = Math.random() * (MAX_LOOPS - MIN_LOOPS) + MIN_LOOPS; // Range from 2 to 10 loops
  for (let i = 0; i < loops; i++) {
    list = list.sort((a, b) => 0.5 - Math.random());
  }
  return list;
};

const copyResultToClipboard = () => {
  try {
    copyToClipboard($('#dictbuilder-textarea-result-id'));
  } catch (err) {
    Alert(err.message, DANGER);
  }
};

const downloadJson = () => {
  const result = $('#dictbuilder-textarea-result-id').val();
  const href = 'data:text/plain;charset=UTF-8,' + encodeURIComponent(result);
  const download = JSON_FILENAME_TEMPLATE.replace(
    '$date',
    moment().format(DATE_FORMAT)
  );

  $('#result-download-link').prop({ href, download });
  $('#result-download-button').click();
};

const configureEditor = () => {
  const jsonViewerOptions = { withQuotes: true, withLinks: false };
  return new JsonEditor('#json-modal-content', jsonViewerOptions);
};

const modalButtonHandle = () => {
  editor ||= configureEditor();
  editor.load(JSON.parse($('#dictbuilder-result-id').text()));
};

const getResultButtonsGroup = () => {
  return [
    $('#open-modal-button'),
    $('#redo-dictbuilder-button'),
    $('#copy-dictbuilder-button'),
    $('#download-dictbuilder-button'),
  ];
};

const separatorSelector = () => {
  let separatorValue = $('#separator-list').val();
  const $customSeparatorElem = $('#separator-custom');
  if (separatorValue !== CUSTOM_OPTION) {
    setVisibleComponents(false, $customSeparatorElem);
    $customSeparatorElem.val('');
  } else {
    setVisibleComponents(true, $customSeparatorElem);
    separatorValue = $customSeparatorElem.val();
  }
  return separatorValue;
};

const isValidEvent = (event) => {
  const { type, keyCode, currentTarget } = event;
  let isValid = true;

  if ([KEY_UP, KEY_DOWN].includes(type) && keyCode === ENTER_KEY) {
    event.preventDefault();
    isValid = false;
  }

  return isValid && type === currentTarget.dataset.eventType;
};

const buildFinalJsonStr = (keyValuesPairsList) => {
  const jsonContent = keyValuesPairsList.join(', ');
  return `{ ${jsonContent} }`;
};

const buildJsonStr = (resultDict, options = {}) => {
  let dictString = '';

  if (!options?.lineBreak) {
    const { dict, separator } = resultDict;
    const items = Object.entries(dict).map(
      ([key, value]) => `"${key}": "${value}"`
    );

    const itemsStr = items.join(', ');
    const keyValuesPairsList = [`"dict": {${itemsStr}}`];
    if (separator) {
      keyValuesPairsList.unshift(`"separator": "${separator}"`);
    }
    dictString = buildFinalJsonStr(keyValuesPairsList);
  } else {
    dictString = JSON.stringify(resultDict, null, options?.spaces);
  }

  return dictString;
};

const updateResult = (resultDict) => {
  const resultButtonsGroup = getResultButtonsGroup();
  let resultNoLinebreak = '';
  let result = '';
  let enableButtons = false;
  let showAdvisor = false;

  if (resultDict) {
    resultNoLinebreak = buildJsonStr(resultDict, null);
    result = buildJsonStr(resultDict, { lineBreak: true, spaces: 4 });
    enableButtons = showAdvisor = true;
  }
  setResult(resultNoLinebreak, result);
  setEnableComponents(enableButtons, ...resultButtonsGroup);
  setVisibleComponents(showAdvisor, $('#dict-lost-advisor'));
};

const deleteNotAllowedChars = (text) => {
  return text
    .deleteAll(SEPARATOR.LINE)
    .deleteAll(DOUBLE_QUOTE)
    .deleteAll(BACKSLASH);
};
const cleanInputChars = () => {
  [$('#dictbuilder-list-id'), $('#separator-custom')].forEach(($elem) => {
    let dictVal = deleteNotAllowedChars($elem.val());
    $elem.val(dictVal);
  });
};

const processListWords = (listWords) => {
  listWords = listWords.deleteEmptyValues();
  listWords = listWords.uniq();
  return listWords;
};

const buildDict = (event) => {
  if (event && !isValidEvent(event)) return;
  cleanInputChars();
  const separator = separatorSelector();
  const dictTextCleaned = $('#dictbuilder-list-id').val().trim();
  let dict = '';
  if (dictTextCleaned) {
    dict = {};
    let listWords = dictTextCleaned.split(separator);
    listWords = processListWords(listWords);
    const keysDictSet = shuffle([...listWords]);
    const valuesDictSet = shuffle([...listWords]);
    keysDictSet.forEach((key, idx) => (dict[key] = valuesDictSet[idx]));
    dict = Boolean(separator) ? { separator, dict } : { dict };
  }
  updateResult(dict);
};

const getDefaultDict = (defaultDictButton) => {
  const { dictType } = defaultDictButton.dataset;
  const dictTypes = {
    BASIC: BASIC_DICT,
    EXTENDED: EXTENDED_DICT,
  };
  const defaultText = dictTypes[dictType] ?? DEFAULT_DICT;
  return defaultText;
};

const addDefaultDict = (event) => {
  const defaultDictButton = getDefaultDict(event.currentTarget);

  $('#dictbuilder-list-id').val(defaultDictButton);
  $('#separator-list').val('');
  buildDict(false);
};

const loadDictionaryBuilderHandle = () => {
  const DICT_BUILDER_EVENTS = `${KEY_DOWN} ${KEY_UP} ${CHANGE} ${CLICK}`;
  $('.dict-builder').on(DICT_BUILDER_EVENTS, buildDict);
  $('.copy-dict').on(CLICK, copyResultToClipboard);
  $('.download-json-dict').on(CLICK, downloadJson);
  $('#open-modal-button').on(CLICK, modalButtonHandle);
  $('.default-dict').on(CLICK, addDefaultDict);
};

export default loadDictionaryBuilderHandle;
