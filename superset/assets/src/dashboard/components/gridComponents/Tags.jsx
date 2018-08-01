import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import AceEditor from 'react-ace';
import 'brace/mode/markdown';
import 'brace/theme/textmate';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import moment from 'moment';
import { unsafe } from 'reactable';
import 'whatwg-fetch';

import DeleteComponentButton from '../DeleteComponentButton';
import DragDroppable from '../dnd/DragDroppable';
import ResizableContainer from '../resizable/ResizableContainer';
import MarkdownModeDropdown from '../menu/MarkdownModeDropdown';
import WithPopoverMenu from '../menu/WithPopoverMenu';
import { componentShape } from '../../util/propShapes';
import { ROW_TYPE, COLUMN_TYPE } from '../../util/componentTypes';
import {
  GRID_MIN_COLUMN_COUNT,
  GRID_MIN_ROW_UNITS,
  GRID_BASE_UNIT,
} from '../../util/constants';

const propTypes = {
  id: PropTypes.string.isRequired,
  parentId: PropTypes.string.isRequired,
  component: componentShape.isRequired,
  parentComponent: componentShape.isRequired,
  index: PropTypes.number.isRequired,
  depth: PropTypes.number.isRequired,
  editMode: PropTypes.bool.isRequired,

  // grid related
  availableColumnCount: PropTypes.number.isRequired,
  columnWidth: PropTypes.number.isRequired,
  onResizeStart: PropTypes.func.isRequired,
  onResize: PropTypes.func.isRequired,
  onResizeStop: PropTypes.func.isRequired,

  // dnd
  deleteComponent: PropTypes.func.isRequired,
  handleComponentDrop: PropTypes.func.isRequired,
  updateComponents: PropTypes.func.isRequired,
};

const defaultProps = {};

const markdownPlaceHolder = `# ✨Tags
## ✨Tags
### ✨Tags

<br />

Click here to edit [markdown](https://bit.ly/1dQOfRK)`;

function linkFormatter(cell, row) {
  const url = `${cell}`;
  return (
    <a href={url} rel="noopener noreferrer" target="_blank">
      {row.name}
    </a>
  );
}

function changedOnFormatter(cell) {
  const date = new Date(cell);
  return unsafe(moment.utc(date).fromNow());
}

class Tags extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      isFocused: false,
      markdownSource: props.component.meta.code,
      editor: null,
      editorMode: 'preview',
      tags: ['test'],
      types: ['chart'],
      data: [],
    };

    this.handleChangeFocus = this.handleChangeFocus.bind(this);
    this.handleChangeEditorMode = this.handleChangeEditorMode.bind(this);
    this.handleMarkdownChange = this.handleMarkdownChange.bind(this);
    this.handleDeleteComponent = this.handleDeleteComponent.bind(this);
    this.setEditor = this.setEditor.bind(this);
    this.fetchResults = this.fetchResults.bind(this);
  }

  componentDidMount() {
    this.fetchResults();
  }

  componentWillReceiveProps(nextProps) {
    const nextSource = nextProps.component.meta.code;
    if (this.state.markdownSource !== nextSource) {
      this.setState({ markdownSource: nextSource });
    }
  }

  componentDidUpdate(prevProps) {
    if (
      this.state.editor &&
      (prevProps.component.meta.width !== this.props.component.meta.width ||
        prevProps.columnWidth !== this.props.columnWidth)
    ) {
      this.state.editor.resize(true);
    }
  }

  setEditor(editor) {
    editor.getSession().setUseWrapMode(true);
    this.setState({
      editor,
    });
  }

  fetchResults() {
    const url = `/tagview/tagged_objects/?tags=${
      this.state.tags
    }&types={this.state.tags}`;

    window.fetch(url)
      .then(response => response.json())
      .then(data => this.setState({ data }));
  }

  handleChangeFocus(nextFocus) {
    const nextFocused = !!nextFocus;
    const nextEditMode = nextFocused ? 'edit' : 'preview';
    this.setState(() => ({ isFocused: nextFocused }));
    this.handleChangeEditorMode(nextEditMode);
  }

  handleChangeEditorMode(mode) {
    if (this.state.editorMode === 'edit') {
      const { updateComponents, component } = this.props;
      if (component.meta.code !== this.state.markdownSource) {
        updateComponents({
          [component.id]: {
            ...component,
            meta: {
              ...component.meta,
              code: this.state.markdownSource,
            },
          },
        });
      }
    }

    this.setState(() => ({
      editorMode: mode,
    }));
  }

  handleMarkdownChange(nextValue) {
    this.setState({
      markdownSource: nextValue,
    });
  }

  handleDeleteComponent() {
    const { deleteComponent, id, parentId } = this.props;
    deleteComponent(id, parentId);
  }

  renderEditMode() {
    return (
      <AceEditor
        mode="markdown"
        theme="textmate"
        onChange={this.handleMarkdownChange}
        width="100%"
        height="100%"
        showGutter={false}
        editorProps={{ $blockScrolling: true }}
        value={
          // thisl allows "select all => delete" to give an empty editor
          typeof this.state.markdownSource === 'string'
            ? this.state.markdownSource
            : markdownPlaceHolder
        }
        readOnly={false}
        onLoad={this.setEditor}
      />
    );
  }

  renderPreviewMode() {
    return (
      <BootstrapTable
        data={this.state.data}
        bordered={false}
        scrollTop={'Top'}
        tableHeaderClass="tag-header-class"
        tableBodyClass="tag-body-class"
        containerClass="tag-container-class"
        tableContainerClass="tag-table-container-class"
        headerContainerClass="tag-header-container-class"
        bodyContainerClass="tag-body-container-class"
      >
        <TableHeaderColumn dataField="id" isKey hidden>
          ID
        </TableHeaderColumn>
        <TableHeaderColumn
          dataField="url"
          dataFormat={linkFormatter}
          width="50%"
        >
          Name
        </TableHeaderColumn>
        <TableHeaderColumn dataField="creator" dataFormat={unsafe} dataSort>
          Creator
        </TableHeaderColumn>
        <TableHeaderColumn dataField="type" dataSort>
          Type
        </TableHeaderColumn>
        <TableHeaderColumn
          dataField="changed_on"
          dataFormat={changedOnFormatter}
          dataSort
        >
          Changed on
        </TableHeaderColumn>
      </BootstrapTable>
    );
  }

  render() {
    const { isFocused, editorMode } = this.state;

    const {
      component,
      parentComponent,
      index,
      depth,
      availableColumnCount,
      columnWidth,
      onResizeStart,
      onResize,
      onResizeStop,
      handleComponentDrop,
      editMode,
    } = this.props;

    // inherit the size of parent columns
    const widthMultiple =
      parentComponent.type === COLUMN_TYPE
        ? parentComponent.meta.width || GRID_MIN_COLUMN_COUNT
        : component.meta.width || GRID_MIN_COLUMN_COUNT;

    const isEditing = editorMode === 'edit';

    return (
      <DragDroppable
        component={component}
        parentComponent={parentComponent}
        orientation={parentComponent.type === ROW_TYPE ? 'column' : 'row'}
        index={index}
        depth={depth}
        onDrop={handleComponentDrop}
        disableDragDrop={isFocused}
        editMode={editMode}
      >
        {({ dropIndicatorProps, dragSourceRef }) => (
          <WithPopoverMenu
            onChangeFocus={this.handleChangeFocus}
            menuItems={[
              <MarkdownModeDropdown
                id={`${component.id}-mode`}
                value={this.state.editorMode}
                onChange={this.handleChangeEditorMode}
              />,
              <DeleteComponentButton onDelete={this.handleDeleteComponent} />,
            ]}
            editMode={editMode}
          >
            <div
              className={cx(
                'dashboard-markdown',
                isEditing && 'dashboard-markdown--editing',
              )}
            >
              <ResizableContainer
                id={component.id}
                adjustableWidth={parentComponent.type === ROW_TYPE}
                adjustableHeight
                widthStep={columnWidth}
                widthMultiple={widthMultiple}
                heightStep={GRID_BASE_UNIT}
                heightMultiple={component.meta.height}
                minWidthMultiple={GRID_MIN_COLUMN_COUNT}
                minHeightMultiple={GRID_MIN_ROW_UNITS}
                maxWidthMultiple={availableColumnCount + widthMultiple}
                onResizeStart={onResizeStart}
                onResize={onResize}
                onResizeStop={onResizeStop}
                // disable resize when editing because if state is not synced
                // with props it will reset the editor text to whatever props is
                editMode={isFocused ? false : editMode}
              >
                <div
                  ref={dragSourceRef}
                  className="dashboard-component dashboard-component-chart-holder"
                >
                  {editMode && isEditing
                    ? this.renderEditMode()
                    : this.renderPreviewMode()}
                </div>
              </ResizableContainer>
            </div>
            {dropIndicatorProps && <div {...dropIndicatorProps} />}
          </WithPopoverMenu>
        )}
      </DragDroppable>
    );
  }
}

Tags.propTypes = propTypes;
Tags.defaultProps = defaultProps;

export default Tags;
