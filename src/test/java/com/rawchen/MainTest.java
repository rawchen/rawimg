package com.rawchen;

import com.rawchen.service.OssUploadService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * @author RawChen
 * @date 2026-07-09 11:12
 */
@SpringBootTest
public class MainTest {

    @Autowired
    OssUploadService ossUploadService;

    @Test
    void test01() {
        String fileName = "task/" + java.util.UUID.randomUUID().toString().replace("-", "") + ".jpeg";
        System.out.println(ossUploadService.uploadFromUrl("https://tmp.cangyuansuanli.cn/gen-images/66/task_2zPuPUz4OwvDmnkyNrkMAR3CAt4GUUZi/0.png", fileName));
    }


}
