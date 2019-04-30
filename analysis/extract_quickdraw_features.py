from __future__ import division
import os
import numpy as np
import thread

class_list = ['bear','cat','duck','lion','pig','rabbit','sheep','swan']

if __name__ == "__main__":

    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--data_dir', type=str, help='where are the source png dirs?', default='/home/jefan/collabdraw/sketches/quickdraw/png')
    parser.add_argument('--out_dir', type=str, help='where do the features go?', default='/home/jefan/collabdraw/features/quickdraw')    
    args = parser.parse_args()
    
    for this_class in class_list:
                
        cmd_string = "python extract_features.py --data='{}/{}' --layer_ind=5 --data_type='sketch' --spatial_avg=True --channel_norm=False --out_dir='{}/{}'".format(args.data_dir,this_class,args.out_dir,this_class)
        print(cmd_string)
        thread.start_new_thread(os.system,(cmd_string,))