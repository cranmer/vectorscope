Frontend API (TypeScript)
=========================

Types
-----

Core types are defined in ``frontend/src/types/index.ts``.

Layer
^^^^^

.. code-block:: typescript

   interface Layer {
     id: string;
     name: string;
     description: string | null;
     dimensionality: number;
     point_count: number;
     source_transformation_id: string | null;
     is_derived: boolean;
     column_names: string[] | null;
     feature_columns: string[] | null;
     label_column: string | null;
   }

Point
^^^^^

.. code-block:: typescript

   interface Point {
     id: string;
     label: string | null;
     metadata: Record<string, unknown>;
     vector: number[];
     is_virtual: boolean;
   }

Projection
^^^^^^^^^^

.. code-block:: typescript

   interface Projection {
     id: string;
     name: string;
     type: 'pca' | 'tsne' | 'custom_axes';
     layer_id: string;
     dimensions: number;
     parameters: Record<string, unknown>;
     random_seed: number | null;
   }

Transformation
^^^^^^^^^^^^^^

.. code-block:: typescript

   interface Transformation {
     id: string;
     name: string;
     type: 'scaling' | 'rotation' | 'affine' | 'linear';
     source_layer_id: string;
     target_layer_id: string | null;
     parameters: Record<string, unknown>;
     is_invertible: boolean;
   }

API Client
----------

Located in ``frontend/src/api/client.ts``.

Usage
^^^^^

.. code-block:: typescript

   import { api } from './api/client';

   // List layers
   const layers = await api.layers.list();

   // Create synthetic data
   const layer = await api.layers.createSynthetic({
     n_points: 1000,
     dimensionality: 30,
     n_clusters: 5,
   });

   // Create projection
   const projection = await api.projections.create({
     name: 'PCA View',
     type: 'pca',
     layer_id: layer.id,
     dimensions: 2,
   });

   // Get coordinates
   const points = await api.projections.getCoordinates(projection.id);

State Management
----------------

Zustand store in ``frontend/src/stores/appStore.ts``.

Usage
^^^^^

.. code-block:: typescript

   import { useAppStore } from './stores/appStore';

   function MyComponent() {
     const {
       layers,
       projections,
       selectedPointIds,
       createProjection,
       setSelectedPoints,
     } = useAppStore();

     const handleAddView = async () => {
       await createProjection({
         name: 'New View',
         type: 'pca',
         layer_id: layers[0].id,
       });
     };

     return (
       <button onClick={handleAddView}>Add View</button>
     );
   }

Components
----------

Viewport
^^^^^^^^

Renders a 2D scatter plot using Plotly.

.. code-block:: typescript

   import { Viewport } from './components/Viewport';

   <Viewport
     points={projectedPoints}
     selectedIds={selectedPointIds}
     onSelect={setSelectedPoints}
   />

GraphEditor
^^^^^^^^^^^

ReactFlow-based DAG editor.

.. code-block:: typescript

   import { GraphEditor } from './components/GraphEditor';

   <GraphEditor
     layers={layers}
     projections={projections}
     transformations={transformations}
     selectedNodeId={selectedNodeId}
     onSelectNode={handleSelectNode}
   />

ConfigPanel
^^^^^^^^^^^

Right-side configuration panel.

.. code-block:: typescript

   import { ConfigPanel } from './components/ConfigPanel';

   <ConfigPanel
     selectedNodeId={selectedNodeId}
     selectedNodeType={selectedNodeType}
     layers={layers}
     projections={projections}
     transformations={transformations}
     onAddView={handleAddView}
     onAddTransformation={handleAddTransformation}
     onUpdateLayer={updateLayer}
     onUpdateProjection={updateProjection}
     onUpdateTransformation={updateTransformation}
   />
