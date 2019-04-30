from __future__ import division
import os
import urllib, cStringIO
import pymongo as pm ## first establish ssh tunnel to server where database is running
import base64
import numpy as np
from numpy import *
import PIL
from PIL import Image
import base64
import matplotlib
from matplotlib import pylab, mlab, pyplot
from IPython.core.pylabtools import figsize, getfigs
plt = pyplot
import seaborn as sns
sns.set_context('poster')
sns.set_style('white')
from matplotlib.path import Path
import matplotlib.patches as patches
import pandas as pd
from svgpathtools import parse_path, wsvg
from glob import glob
from IPython.display import clear_output
import ast


def list_files(path, ext='png'):
    result = [y for x in os.walk(path) for y in glob(os.path.join(x[0], '*.%s' % ext))]
    return result

def flatten(x):
    return [val for sublist in x for val in sublist]

def make_svg_list(strokes, crop=True, default_bounds = 1000):
    '''
    grab sample drawing's strokes and make a list of svg strings from it
    crop = True if you want to eliminate excess white space around sketch
    default_bounds = the default coordinate of the bottom right corner
    '''
    sketch_coords = []
    ## extract sketch coords  
    if type(strokes)==pd.core.frame.DataFrame:
        for i,d in strokes.iterrows():
            stroke_coords = ast.literal_eval(d['currentRawLineSimplified'])
            if check_for_none_type(stroke_coords):
                sketch_coords.append(np.array(stroke_coords))
            else:
                print 'NoneType found in stroke_coords of length {}'.format(len(stroke_coords))  
        clear_output(wait=True)
    elif type(strokes)==list:
        for i,stroke_coords in enumerate(strokes):
            sketch_coords.append(np.array(stroke_coords))
    
    if crop==True:
        ## rescale sketch coords?    
        sketch_coords = np.array(sketch_coords)                
        
        ## get smallest x,y coordinate
        _lb = np.array([i.min(0) for i in sketch_coords])
        lb = _lb.min(0)

        ## subtract min x,y off to "move" sketch into top left corner
        shifted_coords = [i - lb for i in sketch_coords]

        ## bottom right corner of bounding box
        _ub = np.array([i.max(0) for i in shifted_coords])
        ub = _ub.max(0)
        bounds = np.int(np.max(ub))
                
        ## re-assign shifted_coords to sketch_coords variable
        sketch_coords = shifted_coords
    else:
        ## do not crop
        bounds = default_bounds
        
    ## convert to svg d-string and return
    svg_list = []
    for stroke in sketch_coords:
        svg_list.append(coords_to_svg(stroke))
        
    return svg_list, bounds

def check_for_none_type(coord_list):
    if len([i for i in coord_list if i[0] is None]) == 0:
        return True
    else:
        return False

def coords_to_svg(coord_list):
    d = ' '.join(['%s%d %d' % (['M', 'L'][i>0], x, y) for i, (x, y) in enumerate(coord_list)])
    return d

def render_svg(paths,
               stroke_width = 5,
               stroke_linecap = 'round',
               stroke_color = 'black',
               fill_mode = 'none',
               viewbox=[0, 0, 300, 300],
               base_dir = './',
               out_dir = 'svg',
               out_fname= 'tmp.svg'):

    '''
    see docs for wsvg: https://www.pydoc.io/pypi/svgpathtools-1.3.3/autoapi/paths2svg/index.html?highlight=wsvg#paths2svg.wsvg
    wsvg(paths=None, colors=None, filename=join, stroke_widths=None, nodes=None, node_colors=None, node_radii=None, openinbrowser=False, timestamp=False, margin_size=0.1, mindim=600, dimensions=None, viewbox=None, text=None, text_path=None, font_size=None, attributes=None, svg_attributes=None)
    '''

    ## render out to svg file
    #print('Rendering out to {}'.format(os.path.join(out_dir,out_fname)))
    if not os.path.exists(out_dir):
        os.makedirs(out_dir)
    wsvg(paths,
         attributes=[{'stroke-width':stroke_width,\
                      'stroke-linecap':stroke_linecap,\
                      'stroke':stroke_color,\
                      'fill':fill_mode}]*len(paths),
         viewbox=viewbox,
         filename=os.path.join(base_dir,out_dir,out_fname))

def generate_svg_path_list(svg_dir):
    svg_paths = list_files(svg_dir, ext='svg')
    svg_paths = [i for i in svg_paths if i != '.DS_Store']
    return svg_paths

def svg_to_png(svg_paths,
               base_dir = './',
               out_dir = 'png'):
    '''
    svg_paths: list of paths to svg files
    '''
    if not os.path.exists(os.path.join(base_dir,out_dir)):
        os.makedirs(os.path.join(base_dir,out_dir))
    for path in svg_paths:
        out_path = os.path.join(base_dir,out_dir,'{}.png'.format(path.split('/')[-1].split('.')[0]))
        ## running ImageMagick command 'convert' to convert svgs to pngs
        cmd_string = 'convert {} {}'.format(path,out_path)
        print(cmd_string)
        os.system(cmd_string)
        clear_output(wait=True)

def RGBA2RGB(image, color=(255, 255, 255)):
    """Alpha composite an RGBA Image with a specified color.
    Simpler, faster version than the solutions above.
    Source: http://stackoverflow.com/a/9459208/284318
    Keyword Arguments:
    image -- PIL RGBA Image object
    color -- Tuple r, g, b (default 255, 255, 255)
    """
    image.load()  # needed for split()
    background = Image.new('RGB', image.size, color)
    background.paste(image, mask=image.split()[3])  # 3 is the alpha channel
    return background

def strokes_to_lines(strokes):
    """
    Convert stroke-3 format to polyline format.
    List contains sublist of continuous line segments (strokes).    
    """
    x = 0
    y = 0
    lines = []
    line = []
    for i in range(len(strokes)):
        if strokes[i, 2] == 1:
            x += float(strokes[i, 0])
            y += float(strokes[i, 1])
            line.append([x, y])
            lines.append(line)
            line = []
        else:
            x += float(strokes[i, 0])
            y += float(strokes[i, 1])
            line.append([x, y])
    return lines    
