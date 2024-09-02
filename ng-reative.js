import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const generateLookup = (fileName, propName) => {
    `import { Reactive } from '@livefree/reactive';
import { Select } from '@livefree/react-ui';
import { SelectItem, Spinner } from '@nextui-org/react';

export const _${fileName}sLookup = ({
  data,
  monitors,
  name,
  label,
  value,
  selectionMode,
  ...rest
}) => {
  const { ${propName}s } = data;

  if (monitors.get${fileName}s.executing) {
    return <Spinner label="Loading..." color="primary" />;
  }

  return (
    <Select
      name={name}
      label={label}
      items={${propName}s.map(${propName} => ({
        value: ${propName}.id.toString(),
        label: ${propName}.name,
        description: ${propName}.description,
      }))}
      value={value}
      selectionMode={selectionMode || 'single'}
      emptyContent="No options"
      {...rest}
    >
      {${propName} => (
        <SelectItem key={${propName}.value} value={${propName}.value}>
          {${propName}.label + ' - ' + ${propName}.description}
        </SelectItem>
      )}
    </Select>
  );
};

export const ${fileName}sLookup = Reactive(_${fileName}sLookup, {
  name: '${fileName}sLookup',
  sync: services => [
    {
      execute: () => services.mql.get${fileName}s(),
      deps: [],
    },
  ],
  queries: () => [
    {
      name: '${propName}s',
      execute: db => db.${propName}s.toArray(),
    },
  ],
  monitors: services => [services.mql.get${fileName}s],
});

`
}
export const generateList = (fileName, propName, props) => {

    const names = props.split(",");
    const mapToColumns = (array) => {
        return array.map(item => ({
            propertyName: item,
            name: formatName(item),
            isSortable: true
        }));
    }

    const formatName = (propertyName) => {
        return propertyName
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/^./, str => str.toUpperCase());
    }

    const columns = mapToColumns(names);
    return (
        `
import { useCallback } from 'react';
import { TableColumn, TableRow, TableCell } from '@nextui-org/react';
import { RequestBrokerDataTable } from '@livefree/react-ui';

const columns = ${JSON.stringify(columns)};

export const ${fileName}sList = ({ ${propName}s = [], onSelect, filters }) => {
  const renderCell = useCallback((row, columnKey) => {
    const cellValue = row[columnKey];

    switch (columnKey) {
      case 'enabled':
      case 'nonEditable':
        return cellValue ? <i className="ri-lock-line"></i> : null;
      default:
        return cellValue;
    }
  }, []);

  return (
    <RequestBrokerDataTable
      columns={columns}
      items={${propName}s}
      filters={filters}
      renderColumn={column => (
        <TableColumn
          key={column.propertyName}
          align={column.propertyName === 'actions' ? 'center' : 'start'}
          allowsSorting={column?.isSortable}
        >
          {column.name}
        </TableColumn>
      )}
      renderRow={row => (
        <TableRow key={row.id} onClick={() => onSelect(row)}>
          {columnKey => <TableCell key={columnKey}>{renderCell(row, columnKey)}</TableCell>}
        </TableRow>
      )}
      withPagination
      withSorting
      withColumnSelection
    />
  );
};
`);
}

export const generateWithTemplate = (fileName) => `
import React from 'react';
import { use${fileName} } from './${fileName}Provider';

export const with${fileName} = (Component) => (props) => {
  const { state, setState } = use${fileName}();

  return <Component {...props} state={state} setState={setState} />;
};
`;

export const generateListControllerTemplate = (fileName, propName, folderName) =>
    `import { useCallback } from 'react';
import { Reactive } from '@livefree/reactive';
import { RequestBroker, queryDexieWithMetadata } from '@livefree/applications';
import { FilterMethod, FilterType } from '@livefree/js-common/filters';
import { ${fileName}sList } from 'features/${folderName}';
import { useDialogDelete } from '@livefree/react-ui';

export const _${fileName}sListController = ({ data, services, monitors, onSelect }) => {
  const { ${propName}s } = data;

  const [deleteConfirmation, DeleteConfirmationModal] = useDialogDelete({
    title: 'Delete ${fileName} Confirmation',
    message: model => \`Confirm \${model.name} to delete?\`,
    onSuccess: item => services.${propName}s.delete${fileName}(item.id),
  });

  const handleExecute = useCallback((action, metadata) => {
    action(metadata);
  }, []);

  return (
    <RequestBroker
      actionKey="get${fileName}s"
      action={services.mql.get${fileName}s}
      defaultPaging={{ skip: 0, take: 50, page: 1, totalCount: 0 }}
      isExecuting={monitors.get${fileName}s.executing}
      onExecute={handleExecute}
    >
      <${fileName}sList
        ${propName}s={${propName}s}
        filters={${propName}sFiltersDefinition}
        isLoading={monitors.get${fileName}s.executing}
        onSelect={item => onSelect && onSelect(item)}
        onDelete={item => deleteConfirmation.open(item)}
      />
      <DeleteConfirmationModal />
    </RequestBroker>
  );
};

export const ${fileName}sListController = Reactive(_${fileName}sListController, {
  name: '${fileName}sListController',
  queries: (_, services) => [
    {
      name: '${propName}s',
      execute: db =>
        queryDexieWithMetadata(db, services.mql.get${fileName}s.action, () => db.${propName}s, {
          sorting: true,
        }),
    },
  ],
  monitors: services => [services.mql.get${fileName}s],
});

const ${propName}sFiltersDefinition = [
  {
    name: 'Name',
    title: 'Name',
    typeSearch: FilterMethod.Contains,
    isPlaced: true,
    isShow: true,
    render: {
      type: FilterType.Input,
      isClearable: true,
    }
  }
];
`
export const generateUpdateController = (fileName, propName, folderName) => `import { useState } from 'react';
import { Button } from '@nextui-org/react';
import { Reactive } from '@livefree/reactive';
import { ${fileName}DetailsForm } from 'features/${folderName}';
import { useReactorOnSuccess } from 'core/hooks';
import { withModalController } from '@livefree/react-ui';
import { with${fileName} } from 'features/${folderName}/utils';

export const _${fileName}UpdateController = ({
  services,
  monitors,
  ${propName}Id,
  ${propName},
  onSuccess,
}) => {
  const [form, setForm] = useState({});

  useReactorOnSuccess(services.${propName}s, 'update${fileName}', payload => {
    onSuccess && onSuccess(payload);
  });

  return (
    <>
      <${fileName}DetailsForm onChange={setForm} ${propName}={${propName}} />
      <div className="text-end pb-2">
        <Button
          size="sm"
          color="primary"
          onPress={() =>
            services.${propName}s.update${fileName}(${propName}Id, {
              ...form.data,
            })
          }
          isDisabled={${propName}.nonEditable || !form.isValid}
          isLoading={monitors.update${fileName}.executing}
        >
          Update
        </Button>
      </div>
    </>
  );
};

const ${fileName}UpdateController = Reactive(with${fileName}(_${fileName}UpdateController), {
  name: '${fileName}UpdateController',
  monitors: services => [services.${propName}s.update${fileName}],
});

${fileName}UpdateController.Modal = withModalController(({ onSuccess, ...props }) => {
  return <${fileName}UpdateController onSuccess={onSuccess} {...props} />;
});

export { ${fileName}UpdateController };`

export const generateCreateController = (fileName, propName, folderName) => `import { useState } from 'react';
import { Button } from '@nextui-org/react';
import { Reactive } from '@livefree/reactive';
import { ${fileName}DetailsForm } from 'features/${folderName}';
import { useReactorOnSuccess } from 'core/hooks';
import { withModalController } from '@livefree/react-ui';

export const _${fileName}CreateController = ({ services, monitors, onSuccess }) => {
  const [form, setForm] = useState({});

  useReactorOnSuccess(services.${propName}s, 'create${fileName}', payload => {
    onSuccess && onSuccess(payload);
  });

  return (
    <>
      <${fileName}DetailsForm onChange={setForm} />
      <div className="text-end pb-2">
        <Button
          size="sm"
          color="primary"
          isDisabled={!form.isValid}
          onPress={() =>
            services.${propName}s.create${fileName}({
              ...form.data,
            })
          }
          isLoading={monitors.create${fileName}.executing}
        >
          Create
        </Button>
      </div>
    </>
  );
};

const ${fileName}CreateController = Reactive(_${fileName}CreateController, {
  name: '${fileName}CreateController',
  monitors: services => [services.${propName}s.create${fileName}],
});

${fileName}CreateController.Modal = withModalController(({ onSuccess, ...props }) => (
  <${fileName}CreateController onSuccess={onSuccess} {...props} />
));

export { ${fileName}CreateController };`;

export const generateProvider = (fileName, propName) => `import { createContext } from 'react';
import { Spinner } from '@nextui-org/react';
import { Reactive } from '@livefree/reactive';

export const ${fileName}Context = createContext();

export const _${fileName}Provider = ({ data, children }) => {
  const { ${propName} } = data;

  if (!${propName}?.id) return <Spinner label="Loading..." color="primary" />;

  return <${fileName}Context.Provider value={${propName}}>{children}</${fileName}Context.Provider>;
};

export const ${fileName}Provider = Reactive(_${fileName}Provider, {
  name: '${fileName}Provider',
  sync: (services, { ${propName}Id }) => [
    {
      execute: () => services.${propName}s.get${fileName}(${propName}Id),
      deps: [${propName}Id],
    },
  ],
  queries: ({ ${propName}Id }) => [
    {
      name: '${propName}',
      execute: db => db.${propName}s.get(${propName}Id),
      defaultValue: {},
      deps: [${propName}Id],
    }
      ]
});`

export const generateHOC = (fileName, propName) => `import React from 'react';
import { ${fileName}Context } from './${fileName}Provider';

export const with${fileName} = Wrapper => {
  const _Wrapper = ({ ${propName}Id, ...props }) => {
    const ${propName} = React.useContext(${fileName}Context);

    if (!${propName} || !${propName}?.id || ${propName}?.id !== parseInt(${propName}Id))
      return (
        <>
          <p>
            <strong>Error</strong>
          </p>
          <p>
            A component using <strong>with${fileName}</strong> must be wrapped with{' '}
            <strong>${fileName}Provider</strong>.
          </p>
        </>
      );

    return <Wrapper {...props} ${propName}Id={${propName}Id} ${propName}={${propName}} />;
  };

  return _Wrapper;
};`

export const generateCreateView = (fileName, folderName) => `import { ${fileName}CreateController } from 'features/${folderName}/controllers';
import { useNavigate } from 'react-router-dom';

export const ${fileName}CreateView = () => {
  const navigate = useNavigate();

  return (
    <${fileName}CreateController.Modal
      isOpen={true}
      title={'Create ${fileName}'}
      size="3xl"
      onSuccess={() => navigate('/${folderName}')}
      onClose={() => navigate('/${folderName}')}
    />
  );
};`;

export const generateUpdateView = (fileName, folderName, propName) => `import { Chip } from '@nextui-org/react';
import { ${fileName}UpdateController } from 'features/${folderName}/controllers';
import { ${fileName}Provider, with${fileName} } from 'features/${folderName}/utils';
import { useNavigate } from 'react-router-dom';

export const _${fileName}UpdateView = with${fileName}(({ ${propName}, ${propName}Id }) => {
  const navigate = useNavigate();

  const title = 'Update Api Resource';
  return (
    <${fileName}UpdateController.Modal
      ${propName}Id={${propName}Id}
      isDissmissable={false}
      size="3xl"
      isOpen={true}
      title={
        ${propName}.nonEditable ? (
          <div className="flow">
            <Chip color="danger">Non Editable</Chip> {title}
          </div>
        ) : (
          title
        )
      }
      onSuccess={() => navigate('/${folderName}')}
      onClose={() => navigate('/${folderName}')}
    />
  );
});

export const ${fileName}UpdateView = ({ ${propName}Id }) => {
  ${propName}Id = parseInt(${propName}Id);

  return (
    <${fileName}Provider ${propName}Id={${propName}Id}>
      <_${fileName}UpdateView ${propName}Id={${propName}Id} />
    </${fileName}Provider>
  );
};`;

export const generateListView = (fileName, folderName) => `import { Outlet, useNavigate } from 'react-router-dom';
import { Breadcrumbs, BreadcrumbItem, Button } from '@nextui-org/react';
import { ${fileName}sListController } from 'features/${folderName}/controllers';
import { T } from '@livefree/applications';

export const ${fileName}sListView = () => {
  const navigate = useNavigate();

  return (
    <>
      <div className="flex flex-row justify-between mb-4">
        <Breadcrumbs className="content-center">
          <BreadcrumbItem isDisabled>
            <T keyCode="${folderName}" />
          </BreadcrumbItem>
          <BreadcrumbItem isDisabled>
            <T keyCode="${folderName}" />
          </BreadcrumbItem>
        </Breadcrumbs>
        <div className="text-end pb-2">
          <Button size="sm" onPress={() => navigate('create')}>
            <T keyCode="New" />
          </Button>
        </div>
      </div>
      <${fileName}sListController onSelect={item => navigate('\${item.id}/update')} />
      <Outlet />
    </>
  );
};`;

export const generateDetailsForm = (fileName, propName) => `import { Uniformly } from '@livefree/uniformly';
import { FieldStatus, TextField, Grid } from '@livefree/react-ui';


export const ${fileName}DetailsForm = ({ ${propName}, onChange }) => {
  return (
    <Uniformly name="${propName}Form" onChange={onChange}>
      <Grid cols={2} className="flex flex-row gap-3">
        <Grid.Item colSpan={1} className="flex flex-col gap-y-2">
          <FieldStatus required>
            <TextField
              name="name"
              label="Name"
              value={${propName}?.name}
              validation={x => x.string().max(100).required('Name is required')}
            />
            </FieldStatus>
        </Grid.Item>
      </Grid>
    </Uniformly>
  );
};`

export const generateRouter = (fileName, folderName, propName) => `import { Routes, Route } from 'react-router-dom';
import { WithParams } from './WithParams';
import {
  ${fileName}sListView,
  ${fileName}CreateView,
  ${fileName}UpdateView,
} from 'features/${folderName}/views';

export const ${fileName}Router = () => (
  <Routes>
    <Route path="/" element={<${fileName}sListView />}>
      <Route path="create" element={<${fileName}CreateView />} />
      <Route
        path=':${propName}Id/update'
        element={<WithParams element={${fileName}UpdateView} />}
      />
    </Route>
  </Routes>
);`

export const generateService = (fileName, propName, sdkName) => `import { ReactiveService } from '@livefree/reactive';
import { ${sdkName} } from 'sdk/${sdkName}';

export const ${fileName}sService = new (ReactiveService(
    '${propName}s',
    ${sdkName}.${fileName}sClient,
))();

export const ${fileName}sReactor = ${fileName}sService.reactor('${propName}sReactor', {
    success: (response, services, db) => {
        const { source, args, payload } = response;

        switch (source) {
            case ${fileName}sService.get${fileName}:
                return db.${propName}.put(payload);

            case ${fileName}sService.create${fileName}:
                services.alerts.actionSuccess(\`${fileName} added successfully\`, '${propName}', response);

                return db.${propName}.add(payload);

            case ${fileName}sService.update${fileName}:
                services.alerts.actionSuccess(\`${fileName} updated successfully\`, '${propName}', response);

                return db.${propName}.put(payload);

            case ${fileName}sService.delete${fileName}:
                services.alerts.actionSuccess(\`${fileName} deleted successfully\`, '${propName}', response);

                return db.${propName}.delete(args[0]);

        }
    },
    error: (response, services) => {
        switch (response.service) {
            case ${fileName}sService.create${fileName}:
                return services.alerts.actionError(
                "Failed to create new ${propName}",
                    '${propName}',
                    response,
                );

            case ${fileName}sService.update${fileName}:
                return services.alerts.actionError(
                "Failed to create new ${propName}",
                    '${propName}',
                    response,
                );

            case ${fileName}sService.delete${fileName}:
                return services.alerts.actionError(
                "Failed to create new ${propName}",
                    '${propName}',
                    response,
                );
        }
    },
});`

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultBasePath = path.join(__dirname, 'src', 'features');

if (!fs.existsSync(defaultBasePath)) {
    fs.mkdirSync(defaultBasePath, { recursive: true });
}

inquirer.prompt([
    {
        type: 'input',
        name: 'folderName',
        message: '¿Cuál es el nombre del folder?',
    },
    {
        type: 'input',
        name: 'fileName',
        message: '¿Cuál es el nombre base para los archivos?',
    },
    {
        type: 'input',
        name: 'propName',
        message: '¿Cuál es el nombre de la propiedad que representa los elementos?',
    },
    {
        type: 'input',
        name: 'sdkName',
        message: '¿Cuál es el nombre del SDK?',
    },
    {
        type: 'input',
        name: 'props',
        message: '¿Cuáles son los nombres de las propiedades (separe con comas)?',
    }
]).then(answers => {
    const { folderName, fileName, propName, sdkName, props } = answers;

    const structure = {
        '': [
            `${fileName}Router.jsx`,
            `${fileName}Service.js`,
            `${fileName}DetailsForm.jsx`,
            `${fileName}sList.jsx`,
            `index.js`
        ],
        'controllers': [
            `${fileName}CreateController.jsx`,
            `${fileName}sListController.jsx`,
            `${fileName}UpdateController.jsx`,
            `index.js`
        ],
        'utils': [
            `${fileName}Provider.jsx`,
            `index.js`,
            `with${fileName}.jsx`
        ],
        'views': [
            `${fileName}CreateView.jsx`,
            `${fileName}sListView.jsx`,
            `${fileName}UpdateView.jsx`,
            `index.js`
        ],
        'routing': [
            `${fileName}Router.jsx`,
        ]
    };

    const createStructure = (basePath, structure) => {
        for (const [dir, files] of Object.entries(structure)) {
            const dirPath = path.join(basePath, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }

            files.forEach(file => {
                const filePath = path.join(dirPath, file);
                let content = `// ${file} content`;

                if (file === `${fileName}sList.jsx`) {
                    content = generateList(fileName, propName, props);
                } else if (file === `${fileName}sListController.jsx`) {
                    content = generateListControllerTemplate(fileName, propName, folderName);
                } else if (file === `${fileName}UpdateController.jsx`) {
                    content = generateUpdateController(fileName, propName, folderName);
                } else if (file === `${fileName}CreateController.jsx`) {
                    content = generateCreateController(fileName, propName, folderName);
                } else if (file === `${fileName}Provider.jsx`) {
                    content = generateProvider(fileName, propName);
                } else if (file === `with${fileName}.jsx`) {
                    content = generateHOC(fileName, propName);
                } else if (file === `${fileName}CreateView.jsx`) {
                    content = generateCreateView(fileName, folderName);
                }
                else if (file === `${fileName}sListView.jsx`) {
                    content = generateListView(fileName, folderName);
                }
                else if (file === `${fileName}UpdateView.jsx`) {
                    content = generateUpdateView(fileName, folderName, propName);
                }
                else if (file === `${fileName}Router.jsx`) {
                    content = generateRouter(fileName, folderName, propName);
                }
                else if (file === `${fileName}Service.js`) {
                    content = generateService(fileName, propName, sdkName);
                }
                else if (file === `${fileName}DetailsForm.jsx`) {
                    content = generateDetailsForm(fileName, propName);
                }
                else if (file === `${fileName}Lookup.jsx`) {
                    content = generateLookup(fileName, propName);
                }

                fs.writeFileSync(filePath, content.trim());
            });

            createIndexFile(dirPath);
        }
        const routingPath = path.join(defaultBasePath, 'routing');
        updateRouterFile(routingPath, fileName, propName);
    };

    const finalPath = path.join(defaultBasePath, folderName);
    createStructure(finalPath, structure);

    console.log(`¡Estructura de directorios y archivos creada con éxito en ${finalPath}!`);
}).catch(error => {
    console.error('Error al crear la estructura:', error);
});

function createIndexFile(directoryPath) {
    const files = fs.readdirSync(directoryPath);

    const jsxFiles = files.filter(file => file.endsWith('.jsx'));

    const exportLines = jsxFiles.map(file => {
        const fileNameWithoutExtension = path.basename(file, '.jsx');
        return `export * from './${fileNameWithoutExtension}';`;
    });

    const indexContent = exportLines.join('\n');

    const indexPath = path.join(directoryPath, 'index.js');

    fs.writeFileSync(indexPath, indexContent);

    console.log(`Archivo index.js creado en ${directoryPath}`);
}

function updateRouterFile(directoryPath, fileName, propName) {
    const routerFilePath = path.join(directoryPath, 'Router.jsx');

    if (!fs.existsSync(routerFilePath)) {
        console.error(`El archivo Router.jsx no se encontró en ${directoryPath}`);
        return;
    }

    let fileContent = fs.readFileSync(routerFilePath, 'utf-8');
    const newImportLine = `import { ${fileName}Router } from './${fileName}Router';\n`;
    const newRouteLine = `        <Route path="${propName}/*" element={<${fileName}Router />} />\n`;
    const importInsertionPoint = 'import { BaseLayout } from';
    const routeInsertionPoint = '<Route element={<BaseLayout />}>';

    const importIndex = fileContent.lastIndexOf(importInsertionPoint);
    if (importIndex !== -1) {
        const beforeImport = fileContent.slice(0, importIndex);
        const afterImport = fileContent.slice(importIndex);
        fileContent = `${beforeImport}${newImportLine}${afterImport}`;
    } else {
        console.error('No se encontró el punto de inyección para el import en Router.jsx');
    }

    if (fileContent.includes(routeInsertionPoint)) {
        const [beforeInjection, afterInjection] = fileContent.split(routeInsertionPoint);
        fileContent = `${beforeInjection}${routeInsertionPoint}\n${newRouteLine}${afterInjection}`;
    } else {
        console.error('No se encontró el punto de inyección para la ruta en Router.jsx');
    }

    fs.writeFileSync(routerFilePath, fileContent, 'utf-8');

    console.log(`Línea inyectada correctamente en ${routerFilePath}`);
}

